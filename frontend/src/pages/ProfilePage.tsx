import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage } from '@/utils/errors'
import { formatDate } from '@/utils/format'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
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

  if (!user) return null

  return (
    <div>
      <PageHeader title="Perfil" description="Dados da conta do professor." />
      <Card className="max-w-lg">
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white"
            aria-hidden
          >
            {user.initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">{user.fullName || 'Sem nome'}</p>
            <p className="text-sm text-ink-muted">{user.email}</p>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border pb-3">
            <dt className="text-ink-muted">Conta desde</dt>
            <dd className="font-medium">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">ID</dt>
            <dd className="font-medium">{user.id}</dd>
          </div>
        </dl>
        <Button
          variant="danger"
          className="mt-8"
          loading={loggingOut}
          onClick={handleLogout}
        >
          Sair da conta
        </Button>
      </Card>
    </div>
  )
}
