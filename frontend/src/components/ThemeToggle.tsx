import { AnimatePresence, motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolved, toggleTheme } = useTheme()
  const dark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex size-10 items-center justify-center overflow-hidden rounded-md transition-colors duration-200 ${
        className || 'text-ink-muted hover:bg-surface-hover hover:text-ink'
      }`}
      aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'sun' : 'moon'}
          initial={{ opacity: 0, rotate: -40, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.8 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
