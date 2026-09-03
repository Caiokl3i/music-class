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
  size = 'md',
  className = '',
}: {
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'size-8 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-14 text-lg',
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-medium text-accent ${sizes[size]} ${className}`}
      aria-hidden
    >
      {initialsFrom(name)}
    </span>
  )
}
