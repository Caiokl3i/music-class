import { DateTime } from 'luxon'
import { lessonEnd } from '#services/lesson_schedule'
import { PACKAGES, type PlanPackage } from '#services/package_catalog'
import type User from '#models/user'
import type Lesson from '#models/lesson'
import type Plan from '#models/plan'
import type Student from '#models/student'

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

export function resolveStudioZone(timezone?: string) {
  const zone = timezone?.trim() || 'America/Sao_Paulo'
  return DateTime.now().setZone(zone).isValid ? zone : 'America/Sao_Paulo'
}

export function monthWindow(month?: string, timezone?: string) {
  const zone = resolveStudioZone(timezone)
  const start = month
    ? DateTime.fromISO(`${month}-01`, { zone }).startOf('month')
    : DateTime.now().setZone(zone).startOf('month')

  if (!start.isValid) {
    throw new Error('Invalid month')
  }

  return {
    zone,
    month: start.toFormat('yyyy-MM'),
    start,
    end: start.endOf('month'),
  }
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

export async function buildMonthCsv(user: User, query: { month?: string; timezone?: string }) {
  const window = monthWindow(query.month, query.timezone)
  const [lessons, plans] = await Promise.all([
    user.related('lessons').query().preload('student').preload('plan').orderBy('scheduledAt', 'asc'),
    user.related('plans').query().preload('student').orderBy('id', 'asc'),
  ])

  const rows = [
    ...lessons
      .filter((lesson) => inMonthRange(lesson.scheduledAt, window.start, window.end))
      .map((lesson) => lessonRow(lesson, window.zone)),
    ...plans
      .filter((plan) => inMonthRange(plan.paidAt ?? plan.createdAt, window.start, window.end))
      .map((plan) => planRow(plan, window.zone)),
  ].sort((left, right) => {
    if (left.sort !== right.sort) {
      return left.sort - right.sort
    }
    return left.tipo.localeCompare(right.tipo)
  })

  const body = `\uFEFF${[csvLine([...CSV_HEADER]), ...rows.map((row) => row.line)].join('\r\n')}\r\n`

  return {
    filename: `music-class-${window.month}.csv`,
    body,
  }
}

function lessonRow(lesson: Lesson, zone: string) {
  const student = lesson.$preloaded.student as Student | undefined
  const plan = lesson.$preloaded.plan as Plan | undefined

  return {
    tipo: 'aula',
    sort: lesson.scheduledAt.toMillis(),
    line: csvLine([
      'aula',
      formatWindow(lesson.scheduledAt, lessonEnd(lesson.scheduledAt, lesson.endsAt), zone),
      student?.name ?? '',
      student?.instrument ?? '',
      packageLabel(plan?.package),
      LESSON_STATUS_LABEL[lesson.status] ?? lesson.status,
      '',
      lesson.description,
    ]),
  }
}

function planRow(plan: Plan, zone: string) {
  const student = plan.$preloaded.student as Student | undefined
  const when = plan.paidAt ?? plan.createdAt

  return {
    tipo: 'pacote',
    sort: when.toMillis(),
    line: csvLine([
      'pacote',
      formatStamp(when, zone),
      student?.name ?? '',
      student?.instrument ?? '',
      packageLabel(plan.package),
      PLAN_STATUS_LABEL[plan.status] ?? plan.status,
      formatCsvAmount(Number(plan.price)),
      plan.notes,
    ]),
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

function packageLabel(value: string | undefined) {
  if (value && value in PACKAGES) {
    return PACKAGES[value as PlanPackage].label
  }
  return value ?? ''
}
