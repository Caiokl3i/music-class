import { Outlet, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthLayout() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% -10%, var(--glow), transparent), radial-gradient(ellipse 60% 40% at 90% 100%, var(--glow), transparent)',
        }}
      />
      <div className="absolute right-4 top-4 z-10 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 lg:mb-0 lg:flex-1"
        >
          <Link to="/login" className="inline-block">
            <p className="font-display text-4xl font-semibold tracking-tight text-accent sm:text-5xl">
              Music Class
            </p>
          </Link>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
            Organize alunos, pacotes e aulas particulares com clareza — do agendamento ao pagamento.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="w-full lg:max-w-md"
        >
          <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-xl shadow-black/5 sm:p-8">
            <Outlet />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
