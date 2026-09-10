import { DateTime } from 'luxon'
import { createRequire } from 'node:module'
import { lessonEnd } from '#services/lesson_schedule'
import { packageLabelMap } from '#services/plan_types'
import { formatMoneyBr, monthLabelPt } from '#services/billing_message'
import { netPriceFromPlan } from '#services/plan_pricing'
import { monthWindow, resolveStudioZone, sqliteDateRange } from '#services/studio_timezone'
import { PDF_COLORS as PDF, drawRoundedRect, resolvePdfFonts, useFont } from '#services/pdf_layout'
import type User from '#models/user'
import type Lesson from '#models/lesson'
import type Plan from '#models/plan'
import type Student from '#models/student'

export { monthWindow, resolveStudioZone }

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit') as typeof import('pdfkit')

const LESSON_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada',
  done: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Falta',
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  cancelled: 'Cancelado',
}

export const CSV_HEADER = [
  'tipo',
  'data',
  'aluno',
  'instrumento',
  'pacote',
  'status',
  'valor',
  'anotação',
] as const

type MonthExportRow = {
  tipo: 'aula' | 'pacote'
  sort: number
  dateLabel: string
  student: string
  instrument: string
  packageLabel: string
  status: string
  amount: number | null
  notes: string | null
}

export function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  if (/[";\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function csvLine(cells: Array<string | number | null | undefined>) {
  return cells.map(csvEscape).join(';')
}

export function formatCsvAmount(value: number) {
  return value.toFixed(2).replace('.', ',')
}

export function inMonthRange(value: DateTime | null | undefined, start: DateTime, end: DateTime) {
  return Boolean(value && value >= start && value <= end)
}

function plansInMonthQuery(user: User, start: string, end: string) {
  return user
    .related('plans')
    .query()
    .preload('student')
    .preload('discounts')
    .where((query) => {
      query
        .where((paid) => {
          paid.whereNotNull('paidAt').whereBetween('paidAt', [start, end])
        })
        .orWhere((created) => {
          created.whereNull('paidAt').whereBetween('createdAt', [start, end])
        })
    })
    .orderBy('id', 'asc')
}

async function collectMonthRows(user: User, query: { month?: string; timezone?: string }) {
  const window = monthWindow(query.month, query.timezone)
  const range = sqliteDateRange(window.start, window.end)
  const [lessons, plans, labels] = await Promise.all([
    user
      .related('lessons')
      .query()
      .preload('student')
      .preload('plan')
      .whereBetween('scheduledAt', [range.start, range.end])
      .orderBy('scheduledAt', 'asc'),
    plansInMonthQuery(user, range.start, range.end),
    packageLabelMap(user),
  ])

  const rows = [
    ...lessons
      .filter((lesson) => inMonthRange(lesson.scheduledAt, window.start, window.end))
      .map((lesson) => lessonRow(lesson, window.zone, labels)),
    ...plans
      .filter((plan) => inMonthRange(plan.paidAt ?? plan.createdAt, window.start, window.end))
      .map((plan) => planRow(plan, window.zone, labels)),
  ].sort((left, right) => {
    if (left.sort !== right.sort) {
      return left.sort - right.sort
    }
    return left.tipo.localeCompare(right.tipo)
  })

  return { window, rows }
}

export async function buildMonthCsv(user: User, query: { month?: string; timezone?: string }) {
  const { window, rows } = await collectMonthRows(user, query)

  const body = `\uFEFF${[
    csvLine([...CSV_HEADER]),
    ...rows.map((row) =>
      csvLine([
        row.tipo,
        row.dateLabel,
        row.student,
        row.instrument,
        row.packageLabel,
        row.status,
        row.amount == null ? '' : formatCsvAmount(row.amount),
        row.notes,
      ])
    ),
  ].join('\r\n')}\r\n`

  return {
    filename: `music-class-${window.month}.csv`,
    body,
  }
}

export async function buildMonthPdf(user: User, query: { month?: string; timezone?: string }) {
  const { window, rows } = await collectMonthRows(user, query)
  const monthLabel = monthLabelPt(window.month)
  const lessons = rows.filter((row) => row.tipo === 'aula')
  const plans = rows.filter((row) => row.tipo === 'pacote')
  const revenue = plans.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const body = await renderMonthPdf({
    month: window.month,
    monthLabel,
    lessons,
    plans,
    revenue,
  })

  return {
    filename: `music-class-${window.month}.pdf`,
    body,
  }
}

function lessonRow(lesson: Lesson, zone: string, labels: Map<string, string>): MonthExportRow {
  const student = lesson.$preloaded.student as Student | undefined
  const plan = lesson.$preloaded.plan as Plan | undefined

  return {
    tipo: 'aula',
    sort: lesson.scheduledAt.toMillis(),
    dateLabel: formatWindow(lesson.scheduledAt, lessonEnd(lesson.scheduledAt, lesson.endsAt), zone),
    student: student?.name ?? '',
    instrument: student?.instrument ?? '',
    packageLabel: packageLabel(plan?.package, labels),
    status: LESSON_STATUS_LABEL[lesson.status] ?? lesson.status,
    amount: null,
    notes: lesson.description,
  }
}

function planRow(plan: Plan, zone: string, labels: Map<string, string>): MonthExportRow {
  const student = plan.$preloaded.student as Student | undefined
  const when = plan.paidAt ?? plan.createdAt

  return {
    tipo: 'pacote',
    sort: when.toMillis(),
    dateLabel: formatStamp(when, zone),
    student: student?.name ?? '',
    instrument: student?.instrument ?? '',
    packageLabel: packageLabel(plan.package, labels),
    status: PLAN_STATUS_LABEL[plan.status] ?? plan.status,
    amount: netPriceFromPlan(Number(plan.price), plan.discounts),
    notes: plan.notes,
  }
}

function formatStamp(value: DateTime, zone: string) {
  return value.setZone(zone).toFormat('yyyy-MM-dd HH:mm')
}

function formatWindow(start: DateTime, end: DateTime, zone: string) {
  const from = formatStamp(start, zone)
  const to = end.setZone(zone)
  if (to.hasSame(start.setZone(zone), 'day')) {
    return `${from}–${to.toFormat('HH:mm')}`
  }
  return `${from}–${formatStamp(end, zone)}`
}

function packageLabel(value: string | null | undefined, labels: Map<string, string>) {
  if (!value) {
    return ''
  }
  return labels.get(value) ?? value
}

function drawRow(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string | null; bold: string | null },
  left: string,
  right: string,
  opts: { muted?: boolean; bold?: boolean; color?: string } = {}
) {
  ensureSpace(doc, 22)
  const leftX = doc.page.margins.left
  const rightX = doc.page.width - doc.page.margins.right
  const y = doc.y
  const color = opts.color ?? (opts.muted ? PDF.muted : PDF.ink)

  useFont(doc, fonts, opts.bold ? 'bold' : 'regular')
  doc.fillColor(color).fontSize(opts.bold ? 11 : 10.5)
  doc.text(left, leftX, y, { width: rightX - leftX - 120, continued: false })
  doc.text(right, leftX, y, { width: rightX - leftX, align: 'right' })
  doc.moveDown(0.55)
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const maxY = doc.page.height - doc.page.margins.bottom - 28
  if (doc.y + needed > maxY) {
    doc.addPage()
  }
}

function sectionTitle(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string | null; bold: string | null },
  title: string
) {
  ensureSpace(doc, 40)
  const margin = doc.page.margins.left
  const contentWidth = doc.page.width - margin - doc.page.margins.right
  useFont(doc, fonts, 'bold')
  doc.fillColor(PDF.ink).fontSize(12).text(title, margin, doc.y)
  doc.moveDown(0.45)
  doc
    .moveTo(margin, doc.y)
    .lineTo(margin + contentWidth, doc.y)
    .strokeColor(PDF.border)
    .lineWidth(1)
    .stroke()
  doc.moveDown(0.55)
}

function renderMonthPdf(input: {
  month: string
  monthLabel: string
  lessons: MonthExportRow[]
  plans: MonthExportRow[]
  revenue: number
}): Promise<Buffer> {
  const fonts = resolvePdfFonts()

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      info: {
        Title: `Relatório — ${input.monthLabel}`,
        Author: 'Music Class',
      },
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width
    const margin = doc.page.margins.left
    const contentWidth = pageWidth - margin - doc.page.margins.right
    const title = `Relatório — ${input.monthLabel}`

    doc.save()
    doc.rect(0, 0, pageWidth, 108).fill(PDF.accent)
    doc.restore()

    useFont(doc, fonts, 'bold')
    doc.fillColor(PDF.white).fontSize(11).text('Music Class', margin, 28, {
      width: contentWidth,
    })
    doc.fontSize(20).text(title, margin, 50, { width: contentWidth })
    useFont(doc, fonts, 'regular')
    doc
      .fontSize(10)
      .fillColor('#d1fae5')
      .text('Resumo mensal de aulas e pacotes', margin, 78, {
        width: contentWidth,
      })

    doc.y = 128

    const metaTop = doc.y
    const metaHeight = 70
    drawRoundedRect(doc, margin, metaTop, contentWidth, metaHeight, 8, PDF.surface)

    const col = contentWidth / 3
    const metaItems = [
      { label: 'AULAS', value: String(input.lessons.length) },
      { label: 'PACOTES', value: String(input.plans.length) },
      { label: 'VALOR DOS PACOTES', value: formatMoneyBr(input.revenue) },
    ]

    metaItems.forEach((item, index) => {
      const x = margin + 16 + col * index
      useFont(doc, fonts, 'regular')
      doc.fillColor(PDF.muted).fontSize(9).text(item.label, x, metaTop + 14, {
        width: col - 24,
      })
      useFont(doc, fonts, 'bold')
      doc
        .fillColor(index === 2 ? PDF.accent : PDF.ink)
        .fontSize(14)
        .text(item.value, x, metaTop + 32, { width: col - 24 })
    })

    doc.y = metaTop + metaHeight + 28

    sectionTitle(doc, fonts, 'Aulas do mês')
    if (input.lessons.length === 0) {
      useFont(doc, fonts, 'regular')
      doc.fillColor(PDF.muted).fontSize(10.5).text('Nenhuma aula neste período.')
      doc.moveDown(0.4)
    } else {
      for (const lesson of input.lessons) {
        const left = `${lesson.dateLabel} · ${lesson.student || '—'}${
          lesson.instrument ? ` (${lesson.instrument})` : ''
        }`
        drawRow(doc, fonts, left, lesson.status)
        if (lesson.notes) {
          useFont(doc, fonts, 'regular')
          doc
            .fillColor(PDF.muted)
            .fontSize(9)
            .text(lesson.notes, doc.page.margins.left, doc.y, {
              width: contentWidth,
            })
          doc.moveDown(0.35)
        }
      }
    }

    doc.moveDown(0.4)
    sectionTitle(doc, fonts, 'Pacotes do mês')
    if (input.plans.length === 0) {
      useFont(doc, fonts, 'regular')
      doc.fillColor(PDF.muted).fontSize(10.5).text('Nenhum pacote neste período.')
      doc.moveDown(0.4)
    } else {
      for (const plan of input.plans) {
        const left = `${plan.dateLabel} · ${plan.student || '—'} · ${plan.packageLabel} · ${plan.status}`
        drawRow(doc, fonts, left, plan.amount == null ? '—' : formatMoneyBr(plan.amount))
        if (plan.notes) {
          useFont(doc, fonts, 'regular')
          doc
            .fillColor(PDF.muted)
            .fontSize(9)
            .text(plan.notes, doc.page.margins.left, doc.y, {
              width: contentWidth,
            })
          doc.moveDown(0.35)
        }
      }
    }

    ensureSpace(doc, 72)
    doc.moveDown(0.8)
    const totalTop = doc.y
    const totalHeight = 56
    drawRoundedRect(doc, margin, totalTop, contentWidth, totalHeight, 8, PDF.accentSoft)
    doc.save()
    doc.roundedRect(margin, totalTop, 5, totalHeight, 2).fill(PDF.accent)
    doc.restore()

    useFont(doc, fonts, 'regular')
    doc.fillColor(PDF.muted).fontSize(9).text('TOTAL DOS PACOTES', margin + 18, totalTop + 12)
    useFont(doc, fonts, 'bold')
    doc
      .fillColor(PDF.accent)
      .fontSize(18)
      .text(formatMoneyBr(input.revenue), margin + 18, totalTop + 26, {
        width: contentWidth - 36,
      })

    const footerY = doc.page.height - doc.page.margins.bottom - 16
    useFont(doc, fonts, 'regular')
    doc
      .fillColor(PDF.muted)
      .fontSize(8.5)
      .text(
        `Gerado em ${DateTime.now().setZone('America/Sao_Paulo').toFormat("dd/MM/yyyy 'às' HH:mm")} · Music Class · ${input.month}`,
        margin,
        footerY,
        { width: contentWidth, align: 'center', lineBreak: false }
      )

    doc.end()
  })
}
