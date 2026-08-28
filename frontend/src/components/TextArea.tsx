import { forwardRef, type TextareaHTMLAttributes } from 'react'

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, id, className = '', ...props },
  ref,
) {
  const areaId = id ?? props.name

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <textarea
        ref={ref}
        id={areaId}
        className={`min-h-24 rounded-lg border bg-white px-3 py-2 text-sm text-ink transition-colors placeholder:text-slate-400 ${
          error ? 'border-danger' : 'border-border focus:border-brand-600'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
})
