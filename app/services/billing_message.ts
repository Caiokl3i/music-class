import { DateTime } from 'luxon'
import { createRequire } from 'node:module'
import type Plan from '#models/plan'
import type PlanDiscount from '#models/plan_discount'
import type Lesson from '#models/lesson'
import { roundMoney, unitPriceFromPlan } from '#services/plan_pricing'
import { monthWindow, resolveStudioZone } from '#services/studio_timezone'
import { PDF_COLORS as PDF, drawRoundedRect, resolvePdfFonts, useFont } from '#services/pdf_layout'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit') as typeof import('pdfkit')

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export type BillingLessonLine = {
  id: number
  scheduledAt: string
  dateLabel: string
}

export type BillingDiscountLine = {
  id: number
  name: string
  amount: number
  serviceAt: string | null
  dateLabel: string | null
}

export type BillingSummary = {
  planId: number
  studentName: string | null
  month: string | null
  monthLabel: string | null
  unitPrice: number
  lessons: BillingLessonLine[]
  lessonsSubtotal: number
  discounts: BillingDiscountLine[]
  discountTotal: number
  total: number
  text: string
}

export type BuildBillingInput = {
  plan: Plan
  lessons: Lesson[]
  discounts: PlanDiscount[]
  month?: string | null
  timezone?: string
  studentName?: string | null
}

export function formatMoneyBr(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(roundMoney(value))
}

export function formatDayMonth(value: DateTime, zone: string) {
  return value.setZone(zone).toFormat('dd/MM')
}

/** Datas de calendário (serviceAt) sem deslocar pelo fuso da agenda. */
export function formatCalendarDayMonth(value: DateTime) {
  const iso = value.toISODate()
  if (!iso) return value.toFormat('dd/MM')
  const [, month, day] = iso.split('-')
  return `${day}/${month}`
}

export function monthLabelPt(month: string) {
  const [year, monthPart] = month.split('-')
  const index = Number(monthPart) - 1
  const name = MONTH_NAMES_PT[index]
  if (!name || !year) return month
  return name
}

function inRange(value: DateTime | null | undefined, start: DateTime, end: DateTime) {
  return Boolean(value && value >= start && value <= end)
}

function calendarMonthKey(value: DateTime) {
  return value.toISODate()?.slice(0, 7) ?? null
}

export function filterDoneLessons(
  lessons: Lesson[],
  month: string | null | undefined,
  zone: string
) {
  const done = lessons.filter((lesson) => lesson.status === 'done')
  if (!month) {
    return done.sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
  }

  const { start, end } = monthWindow(month, zone)
  return done
    .filter((lesson) => inRange(lesson.scheduledAt, start, end))
    .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
}

export function filterBillingDiscounts(
  discounts: PlanDiscount[],
  month: string | null | undefined,
  _zone: string
) {
  const sorted = [...discounts].sort((a, b) => {
    const aKey = a.serviceAt?.toISODate() ?? a.createdAt.toISODate() ?? ''
    const bKey = b.serviceAt?.toISODate() ?? b.createdAt.toISODate() ?? ''
    return aKey.localeCompare(bKey) || a.id - b.id
  })

  if (!month) return sorted

  return sorted.filter((discount) => {
    if (!discount.serviceAt) return true
    return calendarMonthKey(discount.serviceAt) === month
  })
}

export function buildBillingSummary(input: BuildBillingInput): BillingSummary {
  const zone = resolveStudioZone(input.timezone)
  const month = input.month ?? null
  const unitPrice = unitPriceFromPlan(Number(input.plan.price), input.plan.lessonsTotal)
  const lessons = filterDoneLessons(input.lessons, month, zone)
  const discounts = filterBillingDiscounts(input.discounts, month, zone)

  const lessonsSubtotal = roundMoney(unitPrice * lessons.length)
  const discountTotal = roundMoney(
    discounts.reduce((sum, discount) => sum + Number(discount.amount), 0)
  )
  const total = roundMoney(Math.max(0, lessonsSubtotal - discountTotal))

  const lessonLines: BillingLessonLine[] = lessons.map((lesson) => ({
    id: lesson.id,
    scheduledAt: lesson.scheduledAt.toISO()!,
    dateLabel: formatDayMonth(lesson.scheduledAt, zone),
  }))

  const discountLines: BillingDiscountLine[] = discounts.map((discount) => ({
    id: discount.id,
    name: discount.name,
    amount: Number(discount.amount),
    serviceAt: discount.serviceAt?.toISODate() ?? null,
    dateLabel: discount.serviceAt ? formatCalendarDayMonth(discount.serviceAt) : null,
  }))

  const text = formatBillingText({
    month,
    lessons: lessonLines,
    lessonsSubtotal,
    discounts: discountLines,
    total,
  })

  return {
    planId: input.plan.id,
    studentName: input.studentName ?? null,
    month,
    monthLabel: month ? monthLabelPt(month) : null,
    unitPrice,
    lessons: lessonLines,
    lessonsSubtotal,
    discounts: discountLines,
    discountTotal,
    total,
    text,
  }
}

export function formatBillingText(input: {
  month: string | null
  lessons: BillingLessonLine[]
  lessonsSubtotal: number
  discounts: BillingDiscountLine[]
  total: number
}) {
  const lines: string[] = []

  if (input.month) {
    lines.push(`Informações sobre as aulas de ${monthLabelPt(input.month)}`)
  } else {
    lines.push('Informações sobre as aulas')
  }
  lines.push('')
  lines.push('Aulas realizadas:')

  if (input.lessons.length === 0) {
    lines.push('(nenhuma)')
  } else {
    for (const lesson of input.lessons) {
      lines.push(lesson.dateLabel)
    }
  }

  lines.push(`→ Total das aulas: ${formatMoneyBr(input.lessonsSubtotal)}`)

  for (const discount of input.discounts) {
    lines.push('')
    lines.push(`${discount.name}:`)
    if (discount.dateLabel) {
      lines.push(discount.dateLabel)
    }
    lines.push(`→ ${discount.name}: ${formatMoneyBr(discount.amount)}`)
  }

  lines.push('')
  lines.push(`| Valor total: ${formatMoneyBr(input.total)}`)

  return lines.join('\n')
}

function drawRow(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string | null; bold: string | null },
  left: string,
  right: string,
  opts: { muted?: boolean; bold?: boolean; color?: string } = {}
) {
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

export async function buildBillingPdf(summary: BillingSummary): Promise<Buffer> {
  const fonts = resolvePdfFonts()

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      info: {
        Title: summary.monthLabel
          ? `Cobrança — aulas de ${summary.monthLabel}`
          : 'Cobrança — aulas do pacote',
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
    const title = summary.monthLabel
      ? `Cobrança — aulas de ${summary.monthLabel}`
      : 'Cobrança — aulas do pacote'

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
      .text('Resumo para envio ao aluno ou responsável', margin, 78, {
        width: contentWidth,
      })

    doc.y = 128

    const metaTop = doc.y
    const metaHeight = 58
    drawRoundedRect(doc, margin, metaTop, contentWidth, metaHeight, 8, PDF.surface)

    useFont(doc, fonts, 'regular')
    doc.fillColor(PDF.muted).fontSize(9).text('ALUNO', margin + 16, metaTop + 12)
    useFont(doc, fonts, 'bold')
    doc
      .fillColor(PDF.ink)
      .fontSize(12)
      .text(summary.studentName ?? '—', margin + 16, metaTop + 28, {
        width: contentWidth / 2 - 24,
      })

    useFont(doc, fonts, 'regular')
    doc
      .fillColor(PDF.muted)
      .fontSize(9)
      .text('VALOR POR AULA', margin + contentWidth / 2, metaTop + 12, {
        width: contentWidth / 2 - 16,
        align: 'right',
      })
    useFont(doc, fonts, 'bold')
    doc
      .fillColor(PDF.accent)
      .fontSize(12)
      .text(formatMoneyBr(summary.unitPrice), margin + contentWidth / 2, metaTop + 28, {
        width: contentWidth / 2 - 16,
        align: 'right',
      })

    doc.y = metaTop + metaHeight + 28

    useFont(doc, fonts, 'bold')
    doc.fillColor(PDF.ink).fontSize(12).text('Aulas realizadas', margin, doc.y)
    doc.moveDown(0.45)
    doc
      .moveTo(margin, doc.y)
      .lineTo(margin + contentWidth, doc.y)
      .strokeColor(PDF.border)
      .lineWidth(1)
      .stroke()
    doc.moveDown(0.55)

    if (summary.lessons.length === 0) {
      useFont(doc, fonts, 'regular')
      doc.fillColor(PDF.muted).fontSize(10.5).text('Nenhuma aula concluída neste período.')
      doc.moveDown(0.4)
    } else {
      for (const lesson of summary.lessons) {
        drawRow(doc, fonts, lesson.dateLabel, formatMoneyBr(summary.unitPrice))
      }
    }

    drawRow(doc, fonts, 'Total das aulas', formatMoneyBr(summary.lessonsSubtotal), {
      bold: true,
    })

    if (summary.discounts.length > 0) {
      doc.moveDown(0.6)
      useFont(doc, fonts, 'bold')
      doc.fillColor(PDF.ink).fontSize(12).text('Descontos de troca', margin, doc.y)
      doc.moveDown(0.45)
      doc
        .moveTo(margin, doc.y)
        .lineTo(margin + contentWidth, doc.y)
        .strokeColor(PDF.border)
        .lineWidth(1)
        .stroke()
      doc.moveDown(0.55)

      for (const discount of summary.discounts) {
        const label = discount.dateLabel
          ? `${discount.name} · ${discount.dateLabel}`
          : discount.name
        drawRow(doc, fonts, label, `− ${formatMoneyBr(discount.amount)}`, {
          color: PDF.danger,
        })
      }

      drawRow(doc, fonts, 'Total de descontos', formatMoneyBr(summary.discountTotal), {
        bold: true,
        color: PDF.danger,
      })
    }

    doc.moveDown(0.8)
    const totalTop = doc.y
    const totalHeight = 56
    drawRoundedRect(doc, margin, totalTop, contentWidth, totalHeight, 8, PDF.accentSoft)
    doc.save()
    doc.roundedRect(margin, totalTop, 5, totalHeight, 2).fill(PDF.accent)
    doc.restore()

    useFont(doc, fonts, 'regular')
    doc.fillColor(PDF.muted).fontSize(9).text('VALOR TOTAL', margin + 18, totalTop + 12)
    useFont(doc, fonts, 'bold')
    doc
      .fillColor(PDF.accent)
      .fontSize(18)
      .text(formatMoneyBr(summary.total), margin + 18, totalTop + 26, {
        width: contentWidth - 36,
      })

    const footerY = doc.page.height - doc.page.margins.bottom - 16
    useFont(doc, fonts, 'regular')
    doc
      .fillColor(PDF.muted)
      .fontSize(8.5)
      .text(
        `Gerado em ${DateTime.now().setZone('America/Sao_Paulo').toFormat("dd/MM/yyyy 'às' HH:mm")} · Music Class`,
        margin,
        footerY,
        { width: contentWidth, align: 'center', lineBreak: false }
      )

    doc.end()
  })
}

export function billingFilename(summary: BillingSummary) {
  const student = (summary.studentName ?? 'aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'aluno'
  const monthPart = summary.month ?? 'pacote'
  return `cobranca-${student}-${monthPart}.pdf`
}
