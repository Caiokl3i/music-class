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

export function applyPreferredTime(date: Date, time?: string | null) {
  const { hours, minutes } = parseHm(time)
  const next = new Date(date.getTime())
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function nextDateOnIsoWeekday(from: Date, isoWeekday: number) {
  const target = isoWeekday === 7 ? 0 : isoWeekday
  const delta = (target - from.getDay() + 7) % 7
  const next = new Date(from.getTime())
  next.setDate(from.getDate() + delta)
  return next
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

export function weeklySlots(first: Date, count: number, until?: Date | null) {
  const slots: Date[] = []
  const current = new Date(first.getTime())

  while (slots.length < count) {
    if (until && current.getTime() >= until.getTime()) {
      break
    }
    slots.push(new Date(current.getTime()))
    current.setDate(current.getDate() + 7)
  }

  return slots
}
