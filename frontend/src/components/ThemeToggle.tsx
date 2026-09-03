import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggleTheme } = useTheme()
  const dark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex size-10 items-center justify-center rounded-md transition-colors ${
        className || 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  )
}
