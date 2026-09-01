export function CreditBar({
  remaining,
  total,
  className = '',
}: {
  remaining: number
  total: number
  className?: string
}) {
  const done = total <= 0 ? 0 : Math.max(0, Math.min(100, ((total - remaining) / total) * 100))
  const runningLow = remaining === 1

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-surface-muted ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${runningLow ? 'bg-warning' : 'bg-accent'}`}
        style={{ width: `${done}%` }}
      />
    </div>
  )
}
