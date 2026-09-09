import type { BadgeTone } from '@/components/Badge'

export type StudentLevel = 'beginner' | 'intermediate' | null | undefined

/** Hex #RRGGBB usado no calendário / avatar. */
export type StudentColor = string

export const DEFAULT_STUDENT_COLOR = '#0f766e'

const LEGACY_TONES: Record<string, string> = {
  accent: '#0f766e',
  success: '#047857',
  warning: '#b45309',
  danger: '#dc2626',
}

const FALLBACK_HEXES = ['#0f766e', '#047857', '#b45309', '#dc2626', '#2563eb', '#7c3aed', '#db2777']

export const STUDENT_COLOR_PRESETS = [
  '#0f766e',
  '#047857',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#b45309',
  '#ca8a04',
  '#0891b2',
  '#4b5563',
]

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

/** Normaliza token legado ou hex para #RRGGBB. */
export function resolveStudentHex(color?: string | null, studentId?: number | null): string {
  if (isHexColor(color)) return color.toLowerCase()
  if (color && LEGACY_TONES[color]) return LEGACY_TONES[color]
  if (studentId != null) return FALLBACK_HEXES[Math.abs(studentId) % FALLBACK_HEXES.length]
  return DEFAULT_STUDENT_COLOR
}

export function hexToRgb(hex: string) {
  const normalized = resolveStudentHex(hex)
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

export function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Texto legível sobre fundo sólido da cor do aluno. */
export function contrastingTextColor(hex: string): '#ffffff' | '#1a2433' {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#1a2433' : '#ffffff'
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
