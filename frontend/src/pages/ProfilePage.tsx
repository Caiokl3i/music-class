import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  HardDrive,
  KeyRound,
  LogOut,
  MapPin,
  Music2,
  Palette,
  Shield,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/TextArea'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'
import { formatDate } from '@/utils/format'
import * as authService from '@/services/auth.service'

const profileSchema = z.object({
  fullName: z.string().min(1, 'Informe o nome'),
  phone: z.string().optional(),
  studioName: z.string().optional(),
  city: z.string().optional(),
  instruments: z.string().optional(),
  bio: z.string().max(2000, 'Máximo de 2000 caracteres').optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    password: z.string().min(8, 'Mínimo de 8 caracteres').max(128, 'Máximo de 128 caracteres'),
    passwordConfirmation: z.string().min(8, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>
type SectionId = 'account' | 'preferences' | 'security'

const SECTIONS: Array<{
  id: SectionId
  label: string
  description: string
  icon: typeof UserRound
}> = [
  {
    id: 'account',
    label: 'Conta',
    description: 'Nome, contato e apresentação',
    icon: UserRound,
  },
  {
    id: 'preferences',
    label: 'Preferências',
    description: 'Aparência do aplicativo',
    icon: Palette,
  },
  {
    id: 'security',
    label: 'Segurança',
    description: 'Senha, backup e sessão',
    icon: Shield,
  },
]

const THEME_OPTIONS: Array<{ value: Theme; label: string; hint: string }> = [
  { value: 'system', label: 'Sistema', hint: 'Segue o dispositivo' },
  { value: 'light', label: 'Claro', hint: 'Sempre claro' },
  { value: 'dark', label: 'Escuro', hint: 'Sempre escuro' },
]

export function ProfilePage() {
  const { user, logout, updateProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const [section, setSection] = useState<SectionId>('account')
  const [loggingOut, setLoggingOut] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [sendingBackup, setSendingBackup] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      studioName: user?.studioName ?? '',
      city: user?.city ?? '',
      instruments: user?.instruments ?? '',
      bio: user?.bio ?? '',
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', password: '', passwordConfirmation: '' },
  })

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as SectionId
    if (SECTIONS.some((item) => item.id === hash)) {
      setSection(hash)
    }
  }, [])

  function selectSection(next: SectionId) {
    setSection(next)
    window.history.replaceState(null, '', `#${next}`)
  }

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
      await updateProfile({
        fullName: values.fullName,
        phone: values.phone?.trim() || null,
        studioName: values.studioName?.trim() || null,
        city: values.city?.trim() || null,
        instruments: values.instruments?.trim() || null,
        bio: values.bio?.trim() || null,
      })
      toast.success('Perfil atualizado.')
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field in values) profileForm.setError(field as keyof ProfileValues, { message })
      })
      toast.error(getErrorMessage(error, 'Não foi possível atualizar o perfil.'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleEmailBackup() {
    setSendingBackup(true)
    try {
      const result = await authService.emailBackup()
      toast.success(`Backup enviado para ${result.to}.`)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Não foi possível enviar o backup.'))
    } finally {
      setSendingBackup(false)
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

  const locationLine = [user.city, user.studioName].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
        <div className="relative isolate overflow-hidden px-5 py-8 sm:px-8">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(15,118,110,0.28),transparent_55%),linear-gradient(135deg,rgb(15_23_42)_0%,rgb(15_118_110_/_0.35)_45%,rgb(15_23_42)_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(45,212,191,0.18),transparent_55%),linear-gradient(135deg,rgb(2_6_23)_0%,rgb(15_118_110_/_0.25)_50%,rgb(2_6_23)_100%)]"
            aria-hidden
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-accent-strong text-2xl font-semibold text-white shadow-lg shadow-accent/20"
                aria-hidden
              >
                {user.initials}
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
                  Conta do professor
                </p>
                <h1 className="mt-1 truncate text-2xl font-semibold text-white">
                  {user.fullName || 'Sem nome'}
                </h1>
                <p className="mt-1 truncate text-sm text-white/80">{user.email}</p>
                {locationLine ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/75">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {locationLine}
                  </p>
                ) : null}
                {user.instruments ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-white/75">
                    <Music2 className="size-3.5 shrink-0" aria-hidden />
                    {user.instruments}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-white/65 sm:text-right">
              Conta desde {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          className="grid grid-cols-3 gap-2 lg:flex lg:flex-col"
          aria-label="Seções do perfil"
        >
          {SECTIONS.map((item) => {
            const active = section === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors lg:min-h-0 lg:items-start lg:justify-start lg:px-3.5 lg:text-left ${
                  active
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-border bg-surface-raised text-ink-muted hover:border-border hover:bg-surface-hover hover:text-ink active:bg-surface-hover'
                }`}
              >
                <Icon className="size-4 shrink-0 lg:mt-0.5" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 hidden text-xs opacity-80 lg:block">{item.description}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm sm:p-6">
          {section === 'account' ? (
            <form className="space-y-5" onSubmit={profileForm.handleSubmit(onSaveProfile)}>
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-ink">Dados da conta</h2>
                <p className="text-sm text-ink-muted">
                  Como você aparece no estúdio e nas cobranças.
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nome completo"
                  error={profileForm.formState.errors.fullName?.message}
                  {...profileForm.register('fullName')}
                />
                <Input
                  label="Telefone / WhatsApp"
                  hint="Para contato rápido com responsáveis"
                  error={profileForm.formState.errors.phone?.message}
                  {...profileForm.register('phone')}
                />
                <Input
                  label="Nome do estúdio"
                  error={profileForm.formState.errors.studioName?.message}
                  {...profileForm.register('studioName')}
                />
                <Input
                  label="Cidade"
                  error={profileForm.formState.errors.city?.message}
                  {...profileForm.register('city')}
                />
              </div>

              <Input
                label="Instrumentos que ensina"
                hint="Separe por vírgula — ex.: piano, violão, canto"
                error={profileForm.formState.errors.instruments?.message}
                {...profileForm.register('instruments')}
              />

              <TextArea
                label="Sobre você"
                hint="Uma apresentação curta para a ficha do professor"
                rows={4}
                error={profileForm.formState.errors.bio?.message}
                {...profileForm.register('bio')}
              />

              <div className="rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-sm text-ink-muted">
                <p>
                  <span className="font-medium text-ink">E-mail</span> · {user.email}
                </p>
                <p className="mt-1 text-xs">O e-mail de acesso não pode ser alterado por aqui.</p>
              </div>

              <Button type="submit" loading={savingProfile}>
                Salvar alterações
              </Button>
            </form>
          ) : null}

          {section === 'preferences' ? (
            <div className="space-y-5">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-ink">Preferências</h2>
                <p className="text-sm text-ink-muted">Ajuste a aparência do Music Class neste dispositivo.</p>
              </header>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink">Tema</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map((option) => {
                    const selected = theme === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                          selected
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border bg-surface text-ink hover:border-accent/30'
                        }`}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="mt-0.5 block text-xs opacity-80">{option.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}

          {section === 'security' ? (
            <div className="space-y-8">
              <form className="space-y-5" onSubmit={passwordForm.handleSubmit(onSavePassword)}>
                <header className="space-y-1">
                  <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
                    <KeyRound className="size-5 text-accent" aria-hidden />
                    Senha
                  </h2>
                  <p className="text-sm text-ink-muted">
                    A sessão atual continua aberta depois de trocar a senha.
                  </p>
                </header>

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
                  hint="Entre 8 e 128 caracteres"
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

              <div className="border-t border-border pt-6">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  <HardDrive className="size-4 text-accent" aria-hidden />
                  Backup
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Gera uma cópia do banco e envia para o e-mail configurado no servidor.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  loading={sendingBackup}
                  onClick={handleEmailBackup}
                >
                  Enviar backup por e-mail
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-ink">Sessão</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Encerra o acesso neste navegador. Você precisará entrar de novo.
                </p>
                <Button
                  variant="danger"
                  className="mt-4"
                  loading={loggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" aria-hidden />
                  Sair da conta
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
