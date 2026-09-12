import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'

const DOMAIN_MESSAGES: Record<string, string> = {
  E_PLAN_NO_CREDITS: 'Este pacote já tem todas as aulas marcadas.',
  E_PLAN_CANCELLED: 'Não é possível agendar aulas em um pacote cancelado.',
  E_PLAN_HAS_ACTIVE_LESSONS:
    'Cancele todas as aulas deste pacote antes de cancelar o pacote.',
  E_PLAN_HAS_LESSONS: 'Só é possível apagar um pacote sem nenhuma aula.',
  E_PLAN_STUDENT_LOCKED: 'Não é possível trocar o aluno de um pacote que já tem aulas.',
  E_STUDENT_HAS_HISTORY: 'Arquive o aluno ou remova pacotes e aulas antes de excluir.',
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
  E_SIGNUP_CLOSED: 'O cadastro está fechado no servidor. Defina SIGNUP_INVITE_CODE e use esse código.',
  E_INVALID_INVITE: 'Código de convite inválido.',
  E_BACKUP_EMAIL_NOT_CONFIGURED:
    'Backup por e-mail não está configurado (falta RESEND_API_KEY ou BACKUP_EMAIL_TO).',
  E_BACKUP_EMAIL_FAILED: 'O Resend recusou o envio. Confira a chave e o e-mail de destino.',
  E_TOO_MANY_REQUESTS: 'Muitas tentativas. Espere um pouco e tente de novo.',
  E_ROW_NOT_FOUND: 'Registro não encontrado.',
  E_UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
  E_UNAUTHORIZED_ACCESS: 'Sessão expirada. Faça login novamente.',
}

const ENGLISH_MESSAGES: Record<string, string> = {
  'signup is closed': DOMAIN_MESSAGES.E_SIGNUP_CLOSED,
  'invalid invite code': DOMAIN_MESSAGES.E_INVALID_INVITE,
  'invalid user credentials': DOMAIN_MESSAGES.E_INVALID_CREDENTIALS,
  'row not found': DOMAIN_MESSAGES.E_ROW_NOT_FOUND,
  'this plan has no remaining lesson credits': DOMAIN_MESSAGES.E_PLAN_NO_CREDITS,
  'cannot consume lesson credits on a cancelled plan': DOMAIN_MESSAGES.E_PLAN_CANCELLED,
  'this plan has expired and cannot consume new lesson credits': DOMAIN_MESSAGES.E_PLAN_EXPIRED,
  'plan lessons total cannot be lower than active lessons':
    DOMAIN_MESSAGES.E_PLAN_LESSONS_TOTAL_TOO_LOW,
  'cancel all lessons on this plan before cancelling the plan':
    DOMAIN_MESSAGES.E_PLAN_HAS_ACTIVE_LESSONS,
  'remove all lessons from this plan before deleting it': DOMAIN_MESSAGES.E_PLAN_HAS_LESSONS,
  'cannot change the student of a plan that already has lessons':
    DOMAIN_MESSAGES.E_PLAN_STUDENT_LOCKED,
  'archive this student or remove packages and lessons before deleting':
    DOMAIN_MESSAGES.E_STUDENT_HAS_HISTORY,
  'this time overlaps another scheduled lesson': DOMAIN_MESSAGES.E_LESSON_SCHEDULE_CONFLICT,
  'lesson end must be after the start': DOMAIN_MESSAGES.E_LESSON_INVALID_DURATION,
  'the lesson student must match the plan student': DOMAIN_MESSAGES.E_LESSON_STUDENT_MISMATCH,
  'only a no_show lesson can be repositioned': DOMAIN_MESSAGES.E_LESSON_REPOSITION_REQUIRES_NO_SHOW,
  'unknown plan type': DOMAIN_MESSAGES.E_PLAN_TYPE_UNKNOWN,
  'this plan type is used by existing packages and cannot be deleted':
    DOMAIN_MESSAGES.E_PLAN_TYPE_IN_USE,
  'too many requests. try again later.': DOMAIN_MESSAGES.E_TOO_MANY_REQUESTS,
  'backup email is not configured': DOMAIN_MESSAGES.E_BACKUP_EMAIL_NOT_CONFIGURED,
  'could not send the backup email': DOMAIN_MESSAGES.E_BACKUP_EMAIL_FAILED,
  'unauthorized access': DOMAIN_MESSAGES.E_UNAUTHORIZED,
  'unauthorized': DOMAIN_MESSAGES.E_UNAUTHORIZED,
  'access denied': 'Acesso recusado.',
}

const FIELD_LABELS: Record<string, string> = {
  email: 'e-mail',
  password: 'senha',
  passwordConfirmation: 'confirmação de senha',
  currentPassword: 'senha atual',
  fullName: 'nome',
  phone: 'telefone',
  studioName: 'estúdio',
  city: 'cidade',
  instruments: 'instrumentos',
  bio: 'sobre você',
  name: 'nome',
  instrument: 'instrumento',
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
  amount: 'valor',
  timezone: 'fuso',
  month: 'mês',
}

function readBody(data: unknown): ApiErrorBody | undefined {
  if (!data) return undefined
  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (!trimmed) return undefined
    try {
      return JSON.parse(trimmed) as ApiErrorBody
    } catch {
      return { message: trimmed }
    }
  }
  if (typeof data === 'object') return data as ApiErrorBody
  return undefined
}

function domainMessage(value?: string) {
  if (!value) return undefined
  if (DOMAIN_MESSAGES[value]) return DOMAIN_MESSAGES[value]
  return ENGLISH_MESSAGES[value.trim().toLowerCase()]
}

function translateValidationMessage(message: string, field?: string, rule?: string) {
  const label = (field && FIELD_LABELS[field]) || field || 'campo'
  const lower = message.toLowerCase()

  if (
    rule === 'database.unique' ||
    rule === 'unique' ||
    lower.includes('unique') ||
    lower.includes('already been taken') ||
    lower.includes('already exists')
  ) {
    return field === 'email' ? 'Este e-mail já está cadastrado.' : `${label} já está em uso.`
  }
  if (lower.includes('sameas') || lower.includes('confirmed') || lower.includes('must be the same')) {
    return 'As senhas não coincidem.'
  }
  if (lower.includes('required') || lower.includes('must be provided') || lower.includes('is required')) {
    return `Informe ${label}.`
  }
  if (lower.includes('email')) {
    return 'Informe um e-mail válido.'
  }
  if (lower.includes('minlength') || lower.includes('at least') || lower.includes('minimum')) {
    return `${label} está curto ou inválido.`
  }
  if (lower.includes('maxlength') || lower.includes('at most') || lower.includes('maximum')) {
    return `${label} está longo demais.`
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

  const fromEnglish = domainMessage(message)
  if (fromEnglish) return fromEnglish

  if (/[A-Za-z]{4,}/.test(message) && !/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(message)) {
    return `Valor inválido em ${label}.`
  }

  return message
}

function configuredApiUrl() {
  const raw = String(import.meta.env.VITE_API_URL ?? '').trim()
  return raw.replace(/\/+$/, '')
}

function apiUrlHint() {
  const url = configuredApiUrl()
  if (!url) {
    return 'O front foi compilado sem VITE_API_URL, então está tentando localhost:3333.'
  }
  if (/localhost|127\.0\.0\.1/.test(url)) {
    return `O front no ar está chamando ${url} — isso precisa ser a URL da API (Render), não localhost.`
  }
  return `API configurada: ${url}`
}

function requestPath(error: { config?: { baseURL?: string; url?: string } }) {
  return `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`.toLowerCase()
}

function looksLikeHtml(value: string) {
  return /<!doctype|<html|<\/html>|<body/i.test(value)
}

function statusMessage(status: number, path: string) {
  if (path.includes('/auth/login') && (status === 400 || status === 401)) {
    return DOMAIN_MESSAGES.E_INVALID_CREDENTIALS
  }
  if (path.includes('/auth/signup') && status === 403) {
    return 'Cadastro recusado: código de convite inválido ou SIGNUP_INVITE_CODE vazio no servidor.'
  }
  if (status === 400) return 'Pedido inválido. Confira os dados enviados.'
  if (status === 401) return DOMAIN_MESSAGES.E_UNAUTHORIZED
  if (status === 403) return 'Acesso recusado. Confira o convite, a permissão ou o CORS_ORIGIN.'
  if (status === 404) return DOMAIN_MESSAGES.E_ROW_NOT_FOUND
  if (status === 409) return 'Conflito com um registro que já existe.'
  if (status === 422) return 'A API recusou os dados. Confira os campos e tente de novo.'
  if (status === 429) return DOMAIN_MESSAGES.E_TOO_MANY_REQUESTS
  if (status === 502) return 'A API falhou ao falar com um serviço externo (e-mail).'
  if (status === 503) return 'Serviço indisponível. No Render grátis ele pode estar acordando (~1 min).'
  if (status >= 500) return `Erro interno no servidor (HTTP ${status}).`
  return `A API recusou a ação (HTTP ${status}).`
}

export function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    if (error instanceof Error && error.message.trim()) {
      return domainMessage(error.message) ?? error.message
    }
    return 'Erro inesperado no navegador.'
  }

  const path = requestPath(error)

  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return `O servidor demorou demais para responder. No Render grátis, espere ~1 min e tente de novo. ${apiUrlHint()}`
    }
    const axiosText = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
    if (axiosText.includes('cors')) {
      return `O navegador bloqueou por CORS. No Render, CORS_ORIGIN precisa ser a origem deste site. ${apiUrlHint()}`
    }
    if (error.code === 'ERR_NETWORK' || axiosText.includes('network error')) {
      return `O navegador não alcançou a API (endereço errado, CORS ou a API fora do ar). ${apiUrlHint()}`
    }
    return `Não deu para falar com a API. ${apiUrlHint()}`
  }

  const status = error.response.status
  const body = readBody(error.response.data)
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : ''

  if (rawMessage && looksLikeHtml(rawMessage)) {
    return `A resposta não veio da API (página HTML, HTTP ${status}). ${apiUrlHint()}`
  }

  const fromCode = domainMessage(body?.code) ?? domainMessage(body?.message)
  if (fromCode) return fromCode

  if (body?.errors?.length) {
    return body.errors
      .map((item) => translateValidationMessage(item.message, item.field, item.rule))
      .join(' ')
  }

  if (rawMessage && !rawMessage.includes('Axios')) {
    return translateValidationMessage(rawMessage)
  }

  return statusMessage(status, path)
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error)) {
    return {}
  }

  const body = readBody(error.response?.data)
  const result: Record<string, string> = {}

  for (const item of body?.errors ?? []) {
    if (item.field) {
      result[item.field] = translateValidationMessage(item.message, item.field, item.rule)
    }
  }

  return result
}
