import { forwardRef, type TextareaHTMLAttributes } from 'react'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
  hint?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, id, className = '', ...props },
  ref,
) {
  const areaId = id ?? props.name

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <textarea
        ref={ref}
        id={areaId}
        className={`min-h-24 min-w-0 w-full rounded-md border bg-surface-raised px-3 py-2 text-base text-ink transition-colors placeholder:text-ink-muted sm:text-sm ${
          error ? 'border-danger' : 'border-border focus:border-accent'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  )
})
