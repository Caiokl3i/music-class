import { formatDate, formatTimeRange, formatWeekdayLong } from '@/utils/format'

type ReminderLesson = {
  scheduledAt: string
  endsAt?: string | null
  studentName?: string | null
  studentInstrument?: string | null
}

export function formatLessonReminder(lesson: ReminderLesson, heading = 'Olá! Lembrete da aula.') {
  const name = lesson.studentName?.trim() || 'Aluno'
  const instrument = lesson.studentInstrument?.trim()

  const weekday = formatWeekdayLong(lesson.scheduledAt).split(',')[0] ?? formatWeekdayLong(lesson.scheduledAt)
  const when = `${weekday}, ${formatDate(lesson.scheduledAt, 'dd/MM')} às ${formatTimeRange(lesson.scheduledAt, lesson.endsAt)}`

  return [
    heading,
    instrument ? `${name} · ${instrument}` : name,
    when,
  ].join('\n')
}

export function formatTomorrowReminders(lessons: ReminderLesson[]) {
  if (lessons.length === 0) return ''
  const lines = ['Olá! Lembrete das aulas de amanhã.', '']
  for (const lesson of lessons) {
    const name = lesson.studentName?.trim() || 'Aluno'
    const instrument = lesson.studentInstrument?.trim()
    lines.push(instrument ? `${name} · ${instrument}` : name)
    lines.push(`${formatDate(lesson.scheduledAt, 'dd/MM')} às ${formatTimeRange(lesson.scheduledAt, lesson.endsAt)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function whatsappDigits(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.startsWith('55') ? digits : `55${digits}`
}

export function whatsappReminderUrl(phone: string | null | undefined, text: string) {
  const digits = whatsappDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}
