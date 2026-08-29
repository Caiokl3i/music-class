import { forwardRef, type SelectHTMLAttributes } from 'react'

type Option = { value: string | number; label: string }

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  options: Option[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, id, className = '', ...props },
  ref,
) {
  const selectId = id ?? props.name

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        ref={ref}
        id={selectId}
        className={`h-10 rounded-lg border bg-surface-raised px-3 text-sm text-ink transition-colors ${
          error ? 'border-danger' : 'border-border focus:border-brand-600'
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
})
