export function CreditBar({ remaining, total }: { remaining: number; total: number }) {
  const used = total <= 0 ? 0 : Math.max(0, Math.min(100, ((total - remaining) / total) * 100))

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-600 transition-all"
        style={{ width: `${used}%` }}
      />
    </div>
  )
}
