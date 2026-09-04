import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft'
type Size = 'sm' | 'md' | 'lg' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-strong text-white hover:bg-accent-strong-hover shadow-sm disabled:bg-accent-strong/60',
  secondary:
    'border border-border bg-surface-raised text-ink hover:bg-surface-muted disabled:opacity-60',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger/85 shadow-sm disabled:opacity-60',
  dangerSoft:
    'border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-60',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'size-10 p-0',
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
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[colors,transform,box-shadow] duration-150 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0 ${variants[variant]} ${sizes[size]} ${className}`}
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
