import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface-raised p-5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-border hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          {icon ? <span className="text-accent">{icon}</span> : null}
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: ReactNode
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {title ? (
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink">{title}</h1>
        ) : null}
        {description ? (
          <p className={`text-sm text-ink-muted ${title ? 'mt-1' : ''}`}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
