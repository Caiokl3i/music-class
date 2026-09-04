import {
  brazilTodayParts,
  fromBrazilWallTime,
  toDatetimeLocalFromDate,
} from '@/utils/format'

export const FALLBACK_LESSON_TIME = '14:00'

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const

export function formatPreferredSchedule(
  weekday: number | null | undefined,
  time: string | null | undefined,
) {
  const day = WEEKDAY_OPTIONS.find((item) => item.value === weekday)
  if (day && time) return `${day.label} às ${time}`
  if (day) return day.label
  return time || null
}

function parseHm(value: string | null | undefined) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(value || FALLBACK_LESSON_TIME)
  if (!match) {
    return { hours: 14, minutes: 0 }
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}

/** ISO weekday 1=seg … 7=dom a partir de um instante, no fuso de Brasília. */
function brazilIsoWeekday(date: Date) {
  // JS: 0=dom … 6=sáb → ISO: 7=dom, 1=seg …
  const wall = brazilTodayParts(date)
  const asLocal = new Date(wall.year, wall.month - 1, wall.day)
  const jsDay = asLocal.getDay()
  return jsDay === 0 ? 7 : jsDay
}

export function applyPreferredTime(date: Date, time?: string | null) {
  const { hours, minutes } = parseHm(time)
  const wall = brazilTodayParts(date)
  return fromBrazilWallTime(wall.year, wall.month, wall.day, hours, minutes)
}

export function nextDateOnIsoWeekday(from: Date, isoWeekday: number) {
  const wall = brazilTodayParts(from)
  const currentIso = brazilIsoWeekday(from)
  const delta = (isoWeekday - currentIso + 7) % 7
  return fromBrazilWallTime(wall.year, wall.month, wall.day + delta, wall.hour, wall.minute, wall.second)
}

export function preferredSlot(
  student: { preferredWeekday?: number | null; preferredTime?: string | null },
  from: Date = new Date(),
  options?: { lockDate?: boolean },
) {
  const base =
    !options?.lockDate && student.preferredWeekday
      ? nextDateOnIsoWeekday(from, student.preferredWeekday)
      : new Date(from.getTime())
  return applyPreferredTime(base, student.preferredTime)
}

export function addMinutesToDatetimeLocal(value: string, minutes: number) {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return ''
  const [, y, m, d, h, min] = match
  const start = fromBrazilWallTime(Number(y), Number(m), Number(d), Number(h), Number(min))
  return toDatetimeLocalFromDate(new Date(start.getTime() + minutes * 60_000))
}

export function moveDatetimeLocalKeepingDuration(
  previousStart: string,
  previousEnd: string,
  nextStart: string,
  fallbackMinutes: number,
) {
  if (!nextStart) return ''
  const startMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(previousStart)
  const endMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(previousEnd)
  let minutes = fallbackMinutes
  if (startMatch && endMatch) {
    const start = fromBrazilWallTime(
      Number(startMatch[1]),
      Number(startMatch[2]),
      Number(startMatch[3]),
      Number(startMatch[4]),
      Number(startMatch[5]),
    )
    const end = fromBrazilWallTime(
      Number(endMatch[1]),
      Number(endMatch[2]),
      Number(endMatch[3]),
      Number(endMatch[4]),
      Number(endMatch[5]),
    )
    const diff = (end.getTime() - start.getTime()) / 60_000
    if (diff > 0) minutes = diff
  }
  return addMinutesToDatetimeLocal(nextStart, minutes)
}

export function weeklySlots(first: Date, count: number, until?: Date | null) {
  const slots: Date[] = []
  let current = new Date(first.getTime())

  while (slots.length < count) {
    if (until && current.getTime() >= until.getTime()) {
      break
    }
    slots.push(new Date(current.getTime()))
    const wall = brazilTodayParts(current)
    current = fromBrazilWallTime(wall.year, wall.month, wall.day + 7, wall.hour, wall.minute, wall.second)
  }

  return slots
}
