import {
  contrastingTextColor,
  hexToRgba,
  resolveStudentHex,
} from '@/domain/student'

function initialsFrom(name: string | null | undefined) {
  const parts = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({
  name,
  studentId,
  color,
  size = 'md',
  className = '',
}: {
  name?: string | null
  studentId?: number | null
  color?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'size-8 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-14 text-lg',
  }

  const hex =
    color || studentId != null ? resolveStudentHex(color, studentId) : null

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${sizes[size]} ${className} ${
        hex ? '' : 'bg-accent-soft text-accent'
      }`}
      style={
        hex
          ? {
              backgroundColor: hexToRgba(hex, 0.18),
              color: hex,
            }
          : undefined
      }
      aria-hidden
    >
      {initialsFrom(name)}
    </span>
  )
}

export function studentChipStyle(color?: string | null, studentId?: number | null) {
  const hex = resolveStudentHex(color, studentId)
  return {
    backgroundColor: hex,
    color: contrastingTextColor(hex),
  }
}

export function studentDotStyle(color?: string | null, studentId?: number | null) {
  return { backgroundColor: resolveStudentHex(color, studentId) }
}
