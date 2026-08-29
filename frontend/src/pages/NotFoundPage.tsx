import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { ThemeToggle } from '@/components/ThemeToggle'

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-surface px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <p className="font-display text-6xl font-semibold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-ink">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link to="/" className="mt-6">
        <Button>Voltar ao dashboard</Button>
      </Link>
    </div>
  )
}
