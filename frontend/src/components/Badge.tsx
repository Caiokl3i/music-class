type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink',
  brand: 'bg-brand-soft text-brand-on-soft',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning-soft text-warning-on-soft',
  danger: 'bg-danger/15 text-danger',
}

export function Badge({ children, tone = 'neutral' }: { children: string; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
