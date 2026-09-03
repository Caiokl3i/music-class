import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'

const DOMAIN_MESSAGES: Record<string, string> = {
  E_PLAN_NO_CREDITS: 'Este pacote já tem todas as aulas marcadas.',
  E_PLAN_CANCELLED: 'Não é possível agendar aulas em um pacote cancelado.',
  E_LESSON_STUDENT_MISMATCH: 'O aluno da aula precisa ser o mesmo do pacote.',
  E_PLAN_LESSONS_TOTAL_TOO_LOW:
    'Não é possível reduzir o pacote abaixo das aulas já agendadas.',
  E_LESSON_SCHEDULE_CONFLICT: 'Já existe uma aula nesse horário.',
  E_LESSON_INVALID_DURATION: 'O fim da aula precisa ser depois do início.',
  E_PLAN_EXPIRED: 'Este pacote venceu. Venda um novo para continuar agendando.',
  E_LESSON_REPOSITION_REQUIRES_NO_SHOW: 'A reposição só pode ser feita a partir de uma falta registrada.',
  E_INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  E_SIGNUP_CLOSED: 'O cadastro está fechado. Peça um convite.',
  E_INVALID_INVITE: 'Código de convite inválido.',
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback
  }

  const status = error.response?.status
  const body = error.response?.data as ApiErrorBody | undefined

  if (status === 401) {
    return 'Sessão expirada. Faça login novamente.'
  }

  if (status === 404) {
    return 'Registro não encontrado.'
  }

  if (body?.code && DOMAIN_MESSAGES[body.code]) {
    return DOMAIN_MESSAGES[body.code]
  }

  if (body?.message && DOMAIN_MESSAGES[body.message]) {
    return DOMAIN_MESSAGES[body.message]
  }

  if (body?.errors?.length) {
    return body.errors.map((item) => item.message).join(' ')
  }

  if (typeof body?.message === 'string' && body.message && !body.message.includes('Axios')) {
    return body.message
  }

  if (status === 422) {
    return 'Verifique os dados informados e tente novamente.'
  }

  if (status && status >= 500) {
    return 'Erro no servidor. Tente novamente em instantes.'
  }

  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error)) {
    return {}
  }

  const body = error.response?.data as ApiErrorBody | undefined
  const result: Record<string, string> = {}

  for (const item of body?.errors ?? []) {
    if (item.field) {
      result[item.field] = item.message
    }
  }

  return result
}
