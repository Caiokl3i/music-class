import { Link, Outlet } from 'react-router-dom'
import { Music2 } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-sidebar p-4">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-ink" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Link to="/login" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-accent-strong text-white">
            <Music2 className="size-6" aria-hidden />
          </span>
          <span className="text-3xl font-bold text-sidebar-ink">Music Class</span>
        </Link>
        <div className="rounded-lg border-0 bg-surface-raised/95 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-sm text-sidebar-ink/60">
          Organize alunos, pacotes e aulas particulares.
        </p>
      </div>
    </div>
  )
}
