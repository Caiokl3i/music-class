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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function toDatetimeLocalValue(iso: string) {
  const date = parseISO(iso)
  if (!isValid(date)) return ''
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function fromDatetimeLocalValue(value: string) {
  const date = new Date(value)
  return date.toISOString()
}
