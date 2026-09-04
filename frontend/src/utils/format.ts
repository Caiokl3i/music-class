import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Fuso padrão do app (horário de Brasília). */
export const APP_TIMEZONE = 'America/Sao_Paulo'

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function toZonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

/** Date “local falsa” com os componentes do fuso BR — só para formatar com date-fns/pt-BR. */
function asBrazilWallDate(date: Date) {
  const parts = toZonedParts(date)
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

/**
 * Interpreta data/hora de parede em America/Sao_Paulo e devolve o instante UTC.
 */
export function fromBrazilWallTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second)
  let utc = wanted

  for (let i = 0; i < 3; i += 1) {
    const zoned = toZonedParts(new Date(utc))
    const asUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
    )
    utc += wanted - asUtc
  }

  return new Date(utc)
}

export function parseInstant(value: string | Date) {
  if (value instanceof Date) return value
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/** Chave YYYY-MM-DD no fuso de Brasília. */
export function brazilDateKey(value: string | Date | null | undefined) {
  if (!value) return null
  const date = parseInstant(value)
  if (!date) return null
  const parts = toZonedParts(date)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

export function formatDate(value: string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!value) return '—'
  const date = parseInstant(value)
  if (!date) return '—'
  return format(asBrazilWallDate(date), pattern, { locale: ptBR })
}

export function formatDateTime(value: string | null | undefined) {
  return formatDate(value, "dd/MM/yyyy 'às' HH:mm")
}

export function formatWeekdayDateTime(value: Date | string) {
  const date = parseInstant(value)
  if (!date) return '—'
  return format(asBrazilWallDate(date), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
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
  const startDate = parseInstant(start)
  const endDate = parseInstant(end)
  if (!startDate || !endDate) return formatDateTime(start)
  if (brazilDateKey(startDate) === brazilDateKey(endDate)) {
    return `${format(asBrazilWallDate(startDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}–${format(asBrazilWallDate(endDate), 'HH:mm')}`
  }
  return `${formatDateTime(start)} – ${formatDateTime(end)}`
}

/** "Quinta-feira, 16 de outubro" */
export function formatWeekdayLong(value: Date | string) {
  const date = parseInstant(value)
  if (!date) return '—'
  const label = format(asBrazilWallDate(date), "EEEE, d 'de' MMMM", { locale: ptBR })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Idade em anos completos a partir de birthdate "YYYY-MM-DD".
 * Usa o “hoje” em Brasília.
 */
export function ageFromBirthdate(birthdate: string | null | undefined, now = new Date()) {
  if (!birthdate) return null
  const date = parseISO(birthdate.length <= 10 ? `${birthdate}T12:00:00` : birthdate)
  if (!isValid(date)) return null

  const today = toZonedParts(now)
  const birth = toZonedParts(date)

  let years = today.year - birth.year
  const hasHadBirthday =
    today.month > birth.month || (today.month === birth.month && today.day >= birth.day)

  if (!hasHadBirthday) years -= 1
  return years >= 0 ? years : null
}

/** ISO → valor de `<input type="datetime-local">` no horário de Brasília. */
export function toDatetimeLocalValue(iso: string) {
  const date = parseInstant(iso)
  if (!date) return ''
  const parts = toZonedParts(date)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`
}

/** Date → datetime-local no horário de Brasília (não usa o fuso do navegador). */
export function toDatetimeLocalFromDate(date: Date) {
  const parts = toZonedParts(date)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`
}

/**
 * Valor de datetime-local (parede em Brasília) → ISO UTC para a API.
 */
export function fromDatetimeLocalValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) {
    return new Date(value).toISOString()
  }

  const [, y, m, d, h, min] = match
  return fromBrazilWallTime(Number(y), Number(m), Number(d), Number(h), Number(min)).toISOString()
}

/** “Agora” como Date, mas com helpers de calendário em Brasília. */
export function nowInBrazil() {
  return new Date()
}

export function brazilTodayParts(now = new Date()) {
  return toZonedParts(now)
}
