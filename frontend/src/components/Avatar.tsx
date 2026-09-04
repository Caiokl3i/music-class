import { resolveStudentColor, STUDENT_AVATAR_TONE, type StudentColorTone } from '@/domain/student'

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
  /** Fallback estável quando a cor salva não veio na resposta. */
  studentId?: number | null
  color?: StudentColorTone | string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'size-8 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-14 text-lg',
  }

  const tone =
    color || studentId != null
      ? STUDENT_AVATAR_TONE[resolveStudentColor(color, studentId)]
      : 'bg-accent-soft text-accent'

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${tone} ${sizes[size]} ${className}`}
      aria-hidden
    >
      {initialsFrom(name)}
    </span>
  )
}
