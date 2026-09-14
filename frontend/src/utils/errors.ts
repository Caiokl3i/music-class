import { isAxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'

const DOMAIN_MESSAGES: Record<string, string> = {
  E_PLAN_NO_CREDITS: 'Este pacote não tem mais vaga. Cancele uma aula ou venda outro pacote.',
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
  E_LESSON_TOO_LONG: 'A aula não pode durar mais de 8 horas.',
  E_PLAN_EXPIRED: 'Este pacote venceu. Venda um novo para continuar agendando.',
  E_PLAN_TYPE_UNKNOWN: 'Este tipo de pacote não existe. Escolha outro ou crie um novo.',
  E_PLAN_TYPE_IN_USE: 'Não dá para excluir um tipo que já foi vendido. Edite o nome ou o preço.',
  E_LESSON_REPOSITION_REQUIRES_NO_SHOW:
    'A reposição só pode ser feita a partir de uma falta registrada.',
  E_ACCOUNT_NOT_FOUND: 'Não existe uma conta com este e-mail.',
  E_INVALID_PASSWORD: 'Senha incorreta.',
  E_INVALID_CURRENT_PASSWORD: 'Senha atual incorreta.',
  E_INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  E_SIGNUP_CLOSED: 'O cadastro está fechado no momento. Peça acesso a quem administra o estúdio.',
  E_INVITE_REQUIRED: 'Informe o código de convite.',
  E_INVALID_INVITE: 'Código de convite inválido.',
  E_BACKUP_EMAIL_NOT_CONFIGURED: 'Backup por e-mail ainda não está configurado.',
  E_BACKUP_EMAIL_FAILED: 'Não foi possível enviar o backup. Tente de novo em instantes.',
  E_BACKUP_SQLITE_ONLY:
    'Com PostgreSQL o banco já fica no Render. O envio do arquivo SQLite não se aplica.',
  E_TOO_MANY_REQUESTS: 'Muitas tentativas. Espere um pouco e tente de novo.',
  E_ROW_NOT_FOUND: 'Registro não encontrado.',
  E_UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
  E_UNAUTHORIZED_ACCESS: 'Sessão expirada. Faça login novamente.',
}

const ENGLISH_MESSAGES: Record<string, string> = {
  'signup is closed': DOMAIN_MESSAGES.E_SIGNUP_CLOSED,
  'invite code is required': DOMAIN_MESSAGES.E_INVITE_REQUIRED,
  'invalid invite code': DOMAIN_MESSAGES.E_INVALID_INVITE,
  'no account exists with this email': DOMAIN_MESSAGES.E_ACCOUNT_NOT_FOUND,
  'incorrect password': DOMAIN_MESSAGES.E_INVALID_PASSWORD,
  'current password is incorrect': DOMAIN_MESSAGES.E_INVALID_CURRENT_PASSWORD,
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
  'lesson cannot last more than 8 hours': DOMAIN_MESSAGES.E_LESSON_TOO_LONG,
  'the lesson student must match the plan student': DOMAIN_MESSAGES.E_LESSON_STUDENT_MISMATCH,
  'only a no_show lesson can be repositioned': DOMAIN_MESSAGES.E_LESSON_REPOSITION_REQUIRES_NO_SHOW,
  'unknown plan type': DOMAIN_MESSAGES.E_PLAN_TYPE_UNKNOWN,
  'this plan type is used by existing packages and cannot be deleted':
    DOMAIN_MESSAGES.E_PLAN_TYPE_IN_USE,
  'too many requests. try again later.': DOMAIN_MESSAGES.E_TOO_MANY_REQUESTS,
  'backup email is not configured': DOMAIN_MESSAGES.E_BACKUP_EMAIL_NOT_CONFIGURED,
  'could not send the backup email': DOMAIN_MESSAGES.E_BACKUP_EMAIL_FAILED,
  'file backup is only available with sqlite': DOMAIN_MESSAGES.E_BACKUP_SQLITE_ONLY,
  'unauthorized access': DOMAIN_MESSAGES.E_UNAUTHORIZED,
  'unauthorized': DOMAIN_MESSAGES.E_UNAUTHORIZED,
  'access denied': 'Acesso recusado.',
}

const FIELD_BY_CODE: Record<string, string> = {
  E_ACCOUNT_NOT_FOUND: 'email',
  E_INVALID_PASSWORD: 'password',
  E_INVALID_CURRENT_PASSWORD: 'currentPassword',
  E_INVITE_REQUIRED: 'inviteCode',
  E_INVALID_INVITE: 'inviteCode',
  E_SIGNUP_CLOSED: 'inviteCode',
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
  const fromEnglish = domainMessage(message)
  if (fromEnglish) return fromEnglish

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
    return 'O aplicativo foi compilado sem o endereço da API, então está tentando localhost:3333.'
  }
  if (/localhost|127\.0\.0\.1/.test(url)) {
    return `O aplicativo no ar está chamando ${url} — isso precisa ser o endereço da API, não localhost.`
  }
  return `API configurada: ${url}`
}

function requestPath(error: { config?: { baseURL?: string; url?: string } }) {
  return `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`.toLowerCase()
}

function looksLikeHtml(value: string) {
  return /<!doctype|<html|<\/html>|<body/i.test(value)
}

function notFoundMessage(path: string) {
  if (path.includes('/students')) return 'Aluno não encontrado.'
  if (path.includes('/lessons')) return 'Aula não encontrada.'
  if (path.includes('/plan-types') || path.includes('/plan_types')) {
    return 'Tipo de pacote não encontrado.'
  }
  if (path.includes('/discounts')) return 'Desconto não encontrado.'
  if (path.includes('/plans')) return 'Pacote não encontrado.'
  if (path.includes('/account') || path.includes('/profile')) {
    return 'Conta não encontrada. Faça login novamente.'
  }
  return DOMAIN_MESSAGES.E_ROW_NOT_FOUND
}

function statusMessage(status: number, path: string) {
  if (path.includes('/auth/login') && (status === 400 || status === 401)) {
    return 'Não foi possível entrar. Confira o e-mail e a senha.'
  }
  if (path.includes('/account/password') && status === 400) {
    return DOMAIN_MESSAGES.E_INVALID_CURRENT_PASSWORD
  }
  if (path.includes('/auth/signup') && status === 403) {
    return 'Cadastro recusado. Confira o código de convite.'
  }
  if (status === 400) return 'Os dados enviados estão incompletos ou inválidos.'
  if (status === 401) return DOMAIN_MESSAGES.E_UNAUTHORIZED
  if (status === 403) return 'Você não tem permissão para esta ação.'
  if (status === 404) return notFoundMessage(path)
  if (status === 409) return 'Conflito com um registro que já existe.'
  if (status === 422) return 'Confira os dados do formulário e tente de novo.'
  if (status === 429) return DOMAIN_MESSAGES.E_TOO_MANY_REQUESTS
  if (status === 502) return 'Não foi possível concluir o envio. Tente de novo em instantes.'
  if (status === 503) return 'Serviço indisponível no momento. Espere um minuto e tente de novo.'
  if (status >= 500) return 'Erro interno no servidor. Tente de novo em instantes.'
  return 'A ação não pôde ser concluída. Tente de novo.'
}

function resolvedDomainMessage(code?: string, message?: string, path = '') {
  const fromCode = domainMessage(code) ?? domainMessage(message)
  if (!fromCode) return undefined
  if (code === 'E_ROW_NOT_FOUND' || fromCode === DOMAIN_MESSAGES.E_ROW_NOT_FOUND) {
    return notFoundMessage(path)
  }
  return fromCode
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
      return `O servidor demorou demais para responder. Espere um minuto e tente de novo. ${apiUrlHint()}`
    }
    const axiosText = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
    if (axiosText.includes('cors')) {
      return `O navegador bloqueou a conexão com a API. ${apiUrlHint()}`
    }
    if (error.code === 'ERR_NETWORK' || axiosText.includes('network error')) {
      return `Não foi possível alcançar o servidor. Confira a conexão. ${apiUrlHint()}`
    }
    return `Não deu para falar com o servidor. ${apiUrlHint()}`
  }

  const status = error.response.status
  const body = readBody(error.response.data)
  const rawMessage = typeof body?.message === 'string' ? body.message.trim() : ''

  if (rawMessage && looksLikeHtml(rawMessage)) {
    return `A resposta não veio da API (página HTML, HTTP ${status}). ${apiUrlHint()}`
  }

  const fromCode = resolvedDomainMessage(body?.code, body?.message, path)
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

  if (Object.keys(result).length) {
    return result
  }

  const code = body?.code
  const field = code ? FIELD_BY_CODE[code] : undefined
  const message = resolvedDomainMessage(code, body?.message)
  if (field && message) {
    result[field] = message
  }

  return result
}
