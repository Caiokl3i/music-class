import type { BadgeTone } from '@/components/Badge'

export type StudentLevel = 'beginner' | 'intermediate' | null | undefined

/** Cores do calendário / avatar — tokens da paleta. */
export type StudentColorTone = 'accent' | 'success' | 'warning' | 'danger'

export const STUDENT_COLOR_OPTIONS: Array<{ value: StudentColorTone; label: string }> = [
  { value: 'accent', label: 'Verde-água' },
  { value: 'success', label: 'Verde' },
  { value: 'warning', label: 'Amarelo' },
  { value: 'danger', label: 'Vermelho' },
]

const COLOR_TONES: StudentColorTone[] = STUDENT_COLOR_OPTIONS.map((option) => option.value)

export function isStudentColorTone(value: unknown): value is StudentColorTone {
  return typeof value === 'string' && COLOR_TONES.includes(value as StudentColorTone)
}

/** Resolve a cor salva do aluno, com fallback estável pelo id. */
export function resolveStudentColor(
  color?: string | null,
  studentId?: number | null,
): StudentColorTone {
  if (isStudentColorTone(color)) return color
  if (studentId != null) return COLOR_TONES[Math.abs(studentId) % COLOR_TONES.length]
  return 'accent'
}

/** @deprecated Use resolveStudentColor — mantido para chamadas antigas por id. */
export function studentColorTone(studentId: number): StudentColorTone {
  return resolveStudentColor(null, studentId)
}

/** Chip do calendário: fundo sólido + texto branco (diferença óbvia entre alunos). */
export const STUDENT_CALENDAR_CHIP: Record<StudentColorTone, string> = {
  accent: 'bg-accent text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
}

export const STUDENT_AVATAR_TONE: Record<StudentColorTone, string> = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
}

export const STUDENT_DOT: Record<StudentColorTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function levelLabel(level: StudentLevel) {
  if (level === 'beginner') return 'Iniciante'
  if (level === 'intermediate') return 'Intermediário'
  return null
}

export function levelBadgeTone(level: StudentLevel): BadgeTone {
  if (level === 'beginner') return 'accent'
  if (level === 'intermediate') return 'warning'
  return 'neutral'
}
