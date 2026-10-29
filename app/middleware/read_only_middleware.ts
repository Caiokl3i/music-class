import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const RETRY_AFTER_SECONDS = '300'

let overrideReadOnly: boolean | null = null

export function isReadOnlyModeEnabled(): boolean {
  if (overrideReadOnly !== null) {
    return overrideReadOnly
  }
  const raw = (process.env.APP_READ_ONLY ?? env.get('APP_READ_ONLY') ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true'
}

export function setReadOnlyMode(value: boolean | null) {
  overrideReadOnly = value
}

/**
 * Blocks mutating HTTP requests during maintenance or database cutover windows
 * while keeping read endpoints and /health probes fully operational.
 */
export default class ReadOnlyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!isReadOnlyModeEnabled()) {
      return next()
    }

    const method = ctx.request.method().toUpperCase()
    if (SAFE_METHODS.has(method)) {
      return next()
    }

    ctx.response.header('Retry-After', RETRY_AFTER_SECONDS)
    return ctx.response.status(503).json({
      code: 'E_MAINTENANCE_READ_ONLY',
      message:
        'Sistema em manutenção rápida para atualização (modo somente leitura). Suas consultas continuam disponíveis; tente salvar novamente em alguns minutos.',
    })
  }
}
