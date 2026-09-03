import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader, Card, SectionHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import * as authService from '@/services/auth.service'

const profileSchema = z.object({
  fullName: z.string().min(1, 'Informe o nome'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    password: z.string().min(8, 'Mínimo de 8 caracteres').max(32, 'Máximo de 32 caracteres'),
    passwordConfirmation: z.string().min(8, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const { user, logout, updateProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: user?.fullName ?? '' },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', password: '', passwordConfirmation: '' },
  })

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

  async function onSaveProfile(values: ProfileValues) {
    setSavingProfile(true)
    try {
      await updateProfile(values.fullName)
      toast.success('Nome atualizado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o perfil.'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function onSavePassword(values: PasswordValues) {
    setSavingPassword(true)
    try {
      await authService.updatePassword(values)
      passwordForm.reset({ currentPassword: '', password: '', passwordConfirmation: '' })
      toast.success('Senha alterada.')
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) passwordForm.setError(field as keyof PasswordValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível alterar a senha.'))
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div>
      <PageHeader description="Dados da conta do professor." />
      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex size-14 items-center justify-center rounded-lg bg-accent-strong text-lg font-semibold text-white"
              aria-hidden
            >
              {user.initials}
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">{user.fullName || 'Sem nome'}</p>
              <p className="text-sm text-ink-muted">{user.email}</p>
            </div>
          </div>
          <p className="mb-4 text-xs text-ink-muted">Conta desde {formatDate(user.createdAt)}</p>
          <form className="space-y-4" onSubmit={profileForm.handleSubmit(onSaveProfile)}>
            <Input
              label="Nome completo"
              error={profileForm.formState.errors.fullName?.message}
              {...profileForm.register('fullName')}
            />
            <Button type="submit" loading={savingProfile}>
              Salvar nome
            </Button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="Senha" description="A sessão atual continua aberta." />
          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onSavePassword)}>
            <Input
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              hint="Entre 8 e 32 caracteres"
              error={passwordForm.formState.errors.password?.message}
              {...passwordForm.register('password')}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.passwordConfirmation?.message}
              {...passwordForm.register('passwordConfirmation')}
            />
            <Button type="submit" variant="secondary" loading={savingPassword}>
              Alterar senha
            </Button>
          </form>
        </Card>
      </div>

      <Button variant="danger" className="mt-8" loading={loggingOut} onClick={handleLogout}>
        Sair da conta
      </Button>
    </div>
  )
}
