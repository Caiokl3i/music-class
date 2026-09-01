import { forwardRef, type InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...props },
  ref,
) {
  const inputId = id ?? props.name

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`h-10 rounded-lg border bg-surface-raised px-3 text-sm text-ink transition-colors placeholder:text-ink-muted ${
          error ? 'border-danger' : 'border-border focus:border-accent'
        } ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {hint && !error ? (
        <span id={`${inputId}-hint`} className="text-xs text-ink-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
})
