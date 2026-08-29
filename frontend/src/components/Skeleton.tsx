export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-skeleton ${className}`} aria-hidden />
}

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" />
        <p className="text-sm text-ink-muted">Carregando…</p>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface-muted/50 p-5">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="mt-4 h-3 w-full" />
    </div>
  )
}
