export function CreditBar({ remaining, total }: { remaining: number; total: number }) {
  const used = total <= 0 ? 0 : Math.max(0, Math.min(100, ((total - remaining) / total) * 100))
  const warn = remaining <= 1

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
      <div
        className={`h-full rounded-full transition-all ${warn ? 'bg-amber-500' : 'bg-brand-600'}`}
        style={{ width: `${used}%` }}
      />
    </div>
  )
}
