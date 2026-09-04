import { DateTime } from 'luxon'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import type Plan from '#models/plan'
import type PlanDiscount from '#models/plan_discount'
import type Lesson from '#models/lesson'
import { roundMoney, unitPriceFromPlan } from '#services/plan_pricing'

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

const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
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

export function resolveBillingZone(timezone?: string) {
  const zone = timezone || 'America/Sao_Paulo'
  return DateTime.now().setZone(zone).isValid ? zone : 'America/Sao_Paulo'
}

export function monthWindow(month: string, zone: string) {
  const start = DateTime.fromFormat(month, 'yyyy-MM', { zone }).startOf('month')
  if (!start.isValid) {
    throw new Error('Invalid month')
  }
  return { start, end: start.endOf('month'), zone }
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
  const zone = resolveBillingZone(input.timezone)
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

function resolvePdfFont() {
  return FONT_CANDIDATES.find((path) => existsSync(path)) ?? null
}

export async function buildBillingPdf(summary: BillingSummary): Promise<Buffer> {
  const fontPath = resolvePdfFont()

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    if (fontPath) {
      doc.font(fontPath)
    }

    doc.fontSize(16).text(
      summary.monthLabel
        ? `Cobrança — aulas de ${summary.monthLabel}`
        : 'Cobrança — aulas do pacote',
      { align: 'left' }
    )

    if (summary.studentName) {
      doc.moveDown(0.4)
      doc.fontSize(11).text(`Aluno: ${summary.studentName}`)
    }

    doc.moveDown(0.6)
    doc.fontSize(10).text(`Valor por aula: ${formatMoneyBr(summary.unitPrice)}`)
    doc.moveDown(0.8)

    for (const line of summary.text.split('\n')) {
      if (line.length === 0) {
        doc.moveDown(0.35)
        continue
      }
      doc.fontSize(11).text(line)
    }

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
