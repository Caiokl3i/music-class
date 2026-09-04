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
  E_PLAN_TYPE_UNKNOWN: 'Este tipo de pacote não existe. Escolha outro ou crie um novo.',
  E_PLAN_TYPE_IN_USE: 'Não dá para excluir um tipo que já foi vendido. Edite o nome ou o preço.',
  E_LESSON_REPOSITION_REQUIRES_NO_SHOW:
    'A reposição só pode ser feita a partir de uma falta registrada.',
  E_INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  E_SIGNUP_CLOSED: 'O cadastro está fechado. Peça um convite.',
  E_INVALID_INVITE: 'Código de convite inválido.',
}

const FIELD_LABELS: Record<string, string> = {
  email: 'e-mail',
  password: 'senha',
  passwordConfirmation: 'confirmação de senha',
  currentPassword: 'senha atual',
  fullName: 'nome',
  name: 'nome',
  instrument: 'instrumento',
  phone: 'telefone',
  birthdate: 'data de nascimento',
  description: 'observações',
  notes: 'observações',
  level: 'nível',
  tags: 'etiquetas',
  preferredWeekday: 'dia da aula',
  preferredTime: 'horário',
  studentId: 'aluno',
  planId: 'pacote',
  scheduledAt: 'início',
  endsAt: 'fim',
  status: 'status',
  package: 'pacote',
  label: 'nome do pacote',
  lessons: 'quantidade de aulas',
  price: 'preço',
  paidAt: 'pagamento',
  inviteCode: 'código de convite',
  firstScheduledAt: 'primeira aula',
}

function translateValidationMessage(message: string, field?: string) {
  const label = (field && FIELD_LABELS[field]) || field || 'campo'
  const lower = message.toLowerCase()

  if (lower.includes('required') || lower.includes('must be provided') || lower.includes('is required')) {
    return `Informe ${label}.`
  }
  if (lower.includes('email')) {
    return 'Informe um e-mail válido.'
  }
  if (lower.includes('minlength') || lower.includes('at least') || lower.includes('minimum')) {
    return `Valor inválido em ${label}.`
  }
  if (lower.includes('date') || lower.includes('iso8601')) {
    return `Informe uma data válida em ${label}.`
  }
  if (lower.includes('enum') || lower.includes('selected value')) {
    return `Selecione uma opção válida em ${label}.`
  }
  if (lower.includes('number') || lower.includes('integer')) {
    return `Informe um número válido em ${label}.`
  }
  if (/[A-Za-z]{4,}/.test(message) && !/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(message)) {
    return `Valor inválido em ${label}.`
  }

  return message
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
    return body.errors.map((item) => translateValidationMessage(item.message, item.field)).join(' ')
  }

  if (typeof body?.message === 'string' && body.message && !body.message.includes('Axios')) {
    return translateValidationMessage(body.message)
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
      result[item.field] = translateValidationMessage(item.message, item.field)
    }
  }

  return result
}
