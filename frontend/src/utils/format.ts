import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(value: string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!value) return '—'
  const date = parseISO(value)
  if (!isValid(date)) return '—'
  return format(date, pattern, { locale: ptBR })
}

export function formatDateTime(value: string | null | undefined) {
  return formatDate(value, "dd/MM/yyyy 'às' HH:mm")
}

export function formatWeekdayDateTime(value: Date | string) {
  const date = value instanceof Date ? value : parseISO(value)
  if (!isValid(date)) return '—'
  return format(date, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatTime(value: string | null | undefined) {
  return formatDate(value, 'HH:mm')
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return '—'
  if (!end) return formatTime(start)
  return `${formatTime(start)}–${formatTime(end)}`
}

export function formatDateTimeRange(start?: string | null, end?: string | null) {
  if (!start) return '—'
  if (!end) return formatDateTime(start)
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  if (!isValid(startDate) || !isValid(endDate)) return formatDateTime(start)
  if (
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()
  ) {
    return `${format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}–${format(endDate, 'HH:mm')}`
  }
  return `${formatDateTime(start)} – ${formatDateTime(end)}`
}

/** "Quinta-feira, 16 de outubro" */
export function formatWeekdayLong(value: Date | string) {
  const date = value instanceof Date ? value : parseISO(value)
  if (!isValid(date)) return '—'
  const label = format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Age in full years, based on a birthdate in ISO format: "YYYY-MM-DD".
 * Returns `null` when birthdate is missing/invalid.
 */
export function ageFromBirthdate(birthdate: string | null | undefined, now = new Date()) {
  if (!birthdate) return null
  const date = parseISO(birthdate)
  if (!isValid(date)) return null

  let years = now.getFullYear() - date.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate())

  if (!hasHadBirthdayThisYear) years -= 1
  return years >= 0 ? years : null
}

export function toDatetimeLocalValue(iso: string) {
  const date = parseISO(iso)
  if (!isValid(date)) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function toDatetimeLocalFromDate(date: Date) {
  return toDatetimeLocalValue(date.toISOString())
}

export function fromDatetimeLocalValue(value: string) {
  const date = new Date(value)
  return date.toISOString()
}
