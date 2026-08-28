import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
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
