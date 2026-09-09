import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Music2,
  Package,
  UserRound,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Avatar } from '@/components/Avatar'
import { getErrorMessage } from '@/utils/errors'
import { pageMotion, popoverMotion } from '@/utils/motion'

type AppNavItem = {
  to: string
  label: string
  icon: typeof Users
  end?: boolean
}

const mainNav: AppNavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
]

const studioNav: AppNavItem[] = [
  { to: '/students', label: 'Alunos', icon: Users },
  { to: '/plans', label: 'Pacotes', icon: Package },
  { to: '/lessons', label: 'Aulas', icon: CalendarDays },
]

const mobileNav = [...mainNav, ...studioNav]

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

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <aside
        className={`relative hidden h-full shrink-0 flex-col bg-sidebar transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          onNavigate={() => undefined}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute top-6 right-0 z-10 flex size-8 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface-raised shadow-sm hover:bg-surface-muted active:bg-surface-muted"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="size-4 text-ink-muted" />
          ) : (
            <ChevronLeft className="size-4 text-ink-muted" />
          )}
        </button>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4 sm:px-6 lg:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-lg font-bold text-ink lg:text-xl">{pageTitle(location.pathname)}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu
              name={user?.fullName || user?.email}
              email={user?.email}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:p-6 lg:pb-6">
          <motion.div key={location.pathname} {...pageMotion}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised lg:hidden"
        aria-label="Principal"
      >
        <ul className="grid grid-cols-4">
          {mobileNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-accent' : 'text-ink-muted active:bg-surface-muted'
                  }`
                }
              >
                <item.icon className="size-5 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
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
  item: AppNavItem
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
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
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
              className="block px-3 py-3 text-sm text-ink transition-colors hover:bg-surface-muted active:bg-surface-muted"
              onClick={() => setOpen(false)}
            >
              Perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              className="block w-full px-3 py-3 text-left text-sm text-danger transition-colors hover:bg-danger/10 active:bg-danger/10 disabled:opacity-60"
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
