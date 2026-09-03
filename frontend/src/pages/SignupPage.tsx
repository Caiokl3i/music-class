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

const schema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().email('Informe um e-mail válido'),
    password: z.string().min(8, 'Mínimo de 8 caracteres').max(32, 'Máximo de 32 caracteres'),
    passwordConfirmation: z.string().min(8, 'Confirme a senha'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirmation'],
  })

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signup } = useAuth()
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
      await signup(values)
      navigate('/')
    } catch (error) {
      const fields = getFieldErrors(error)
      Object.entries(fields).forEach(([field, message]) => {
        if (
          field === 'email' ||
          field === 'password' ||
          field === 'passwordConfirmation' ||
          field === 'fullName'
        ) {
          setError(field, { message })
        }
      })
      toast.error(getErrorMessage(error, 'Não foi possível criar a conta.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-center text-2xl font-bold text-ink">Criar conta</h1>
      <p className="mt-1 text-center text-sm text-ink-muted">
        Comece a organizar alunos, pacotes e aulas
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Nome completo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
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
          autoComplete="new-password"
          hint="Entre 8 e 32 caracteres"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirmation?.message}
          {...register('passwordConfirmation')}
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Criar conta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
