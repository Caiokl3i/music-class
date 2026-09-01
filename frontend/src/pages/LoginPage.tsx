import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { getErrorMessage, getFieldErrors } from '@/utils/errors'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(8, 'Mínimo de 8 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      navigate('/')
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (field === 'email' || field === 'password') {
          setError(field, { message })
        }
      })
      toast.error(getErrorMessage(error, 'Não foi possível entrar. Verifique suas credenciais.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-ink-muted">Acesse sua conta de professor.</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Não tem conta?{' '}
        <Link to="/signup" className="font-medium text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
