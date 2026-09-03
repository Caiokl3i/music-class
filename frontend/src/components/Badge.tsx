type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-transparent bg-surface-muted text-ink-muted',
  accent: 'border-transparent bg-accent-soft text-accent',
  success: 'border-transparent bg-success/10 text-success',
  warning: 'border-transparent bg-warning/10 text-warning',
  danger: 'border-transparent bg-danger/10 text-danger',
}

export function Badge({ children, tone = 'neutral' }: { children: string; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export type { BadgeTone }
