import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-strong text-white hover:bg-accent-strong-hover shadow-sm shadow-accent-strong/20 disabled:bg-accent-strong/60',
  secondary:
    'bg-surface-raised text-ink border border-border hover:bg-surface-muted shadow-sm disabled:opacity-60',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger/85 shadow-sm disabled:opacity-60',
  dangerSoft:
    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-60',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  )
}
