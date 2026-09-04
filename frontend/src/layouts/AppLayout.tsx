import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Music2,
  Package,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar } from '@/components/Avatar'
import { getErrorMessage } from '@/utils/errors'
import { overlayMotion, pageMotion, popoverMotion } from '@/utils/motion'

const mainNav = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
]

const studioNav = [
  { to: '/students', label: 'Alunos', icon: Users },
  { to: '/plans', label: 'Pacotes', icon: Package },
  { to: '/lessons', label: 'Aulas', icon: CalendarDays },
]

function pageTitle(pathname: string) {
  if (pathname === '/') return 'Painel'
  if (pathname.startsWith('/students/')) return 'Ficha do aluno'
  if (pathname.startsWith('/students')) return 'Alunos'
  if (pathname.startsWith('/plans')) return 'Pacotes'
  if (pathname.startsWith('/lessons')) return 'Aulas'
  if (pathname.startsWith('/profile')) return 'Perfil'
  return 'Music Class'
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
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

  const sidebar = (
    <SidebarContent
      collapsed={collapsed}
      onNavigate={() => setMobileOpen(false)}
      onLogout={handleLogout}
      loggingOut={loggingOut}
    />
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <aside
        className={`relative hidden h-full shrink-0 flex-col bg-sidebar transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebar}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute top-6 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-surface-raised shadow-sm hover:bg-surface-muted"
          style={{ left: collapsed ? 68 : 248 }}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="size-4 text-ink-muted" />
          ) : (
            <ChevronLeft className="size-4 text-ink-muted" />
          )}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-overlay"
              {...overlayMotion}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -24, opacity: 0.85 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl"
            >
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarContent
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-ink hover:bg-surface-muted lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="truncate text-xl font-bold text-ink">{pageTitle(location.pathname)}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              name={user?.fullName || user?.email}
              email={user?.email}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <motion.div key={location.pathname} {...pageMotion}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  collapsed,
  onNavigate,
  onLogout,
  loggingOut,
}: {
  collapsed: boolean
  onNavigate: () => void
  onLogout: () => void
  loggingOut: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6">
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-strong text-white">
              <Music2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xl leading-tight font-bold text-sidebar-ink">Music Class</p>
              <p className="mt-0.5 truncate text-xs text-sidebar-muted">Estúdio particular</p>
            </div>
          </div>
        ) : (
          <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-accent-strong text-white">
            <Music2 className="size-5" aria-hidden />
          </span>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2" aria-label="Principal">
        <ul className="space-y-1">
          {mainNav.map((item) => (
            <li key={item.to}>
              <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <div className="border-sidebar-border mx-2 my-3 border-t" aria-hidden />
        <ul className="space-y-1">
          {studioNav.map((item) => (
            <li key={item.to}>
              <NavItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-sidebar-border shrink-0 border-t px-3 py-4">
        <ul className="space-y-1">
          <li>
            <NavItem
              item={{ to: '/profile', label: 'Perfil', icon: UserRound }}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </li>
          <li>
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="sidebar-item text-left disabled:opacity-60"
              title={collapsed ? 'Sair' : undefined}
            >
              <LogOut className="size-5 shrink-0" aria-hidden />
              {!collapsed ? <span>Sair</span> : null}
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: { to: string; label: string; icon: typeof Users; end?: boolean }
  collapsed: boolean
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
    >
      <item.icon className="size-5 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  )
}

function UserMenu({
  name,
  email,
  onLogout,
  loggingOut,
}: {
  name?: string | null
  email?: string | null
  onLogout: () => void
  loggingOut: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full transition-transform duration-150 active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
      >
        <Avatar name={name} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            {...popoverMotion}
            className="absolute top-full right-0 z-20 mt-2 w-56 origin-top-right overflow-hidden rounded-lg border border-border bg-surface-raised py-1 shadow-lg shadow-black/10"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">{name || 'Conta'}</p>
              {email ? <p className="truncate text-xs text-ink-muted">{email}</p> : null}
            </div>
            <Link
              to="/profile"
              role="menuitem"
              className="block px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
              onClick={() => setOpen(false)}
            >
              Perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              className="block w-full px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
              onClick={onLogout}
            >
              Sair
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
