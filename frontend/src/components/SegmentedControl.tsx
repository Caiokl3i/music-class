import type { ReactNode } from 'react'

type Option<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label?: string
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex rounded-md border border-border bg-surface-raised p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:text-ink active:bg-surface-muted'
            }`}
          >
            {option.icon}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
