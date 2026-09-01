import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarDays,
  UserRound,
  LogOut,
  Menu,
  X,
  Music2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getErrorMessage } from '@/utils/errors'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Alunos', icon: Users },
  { to: '/plans', label: 'Pacotes', icon: Package },
  { to: '/lessons', label: 'Aulas', icon: CalendarDays },
  { to: '/profile', label: 'Perfil', icon: UserRound },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível sair.'))
    } finally {
      setLoggingOut(false)
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-accent-soft text-accent'
        : 'text-ink-muted hover:bg-surface-hover hover:text-ink'
    }`

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-strong text-white">
          <Music2 className="size-4" aria-hidden />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-none text-accent">Music Class</p>
          <p className="mt-1 text-xs text-ink-muted">Painel do professor</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Principal">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="px-1 text-xs font-medium text-ink-muted">Aparência</span>
          <ThemeToggle />
        </div>
        <div className="mb-2 rounded-xl bg-surface-muted px-3 py-2.5">
          <p className="truncate text-sm font-medium text-ink">
            {user?.fullName || user?.email}
          </p>
          <p className="truncate text-xs text-ink-muted">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <aside className="hidden h-full w-64 shrink-0 overflow-hidden border-r border-border bg-surface-raised lg:block">
        {sidebar}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface-raised shadow-xl"
            >
              <div className="absolute right-3 top-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-ink-muted hover:bg-surface-hover"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
              {sidebar}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-ink hover:bg-surface-raised"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="font-display text-lg font-semibold text-accent">Music Class</p>
          <ThemeToggle className="ml-auto" />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
