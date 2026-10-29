import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

export type SentryParsedDsn = {
  publicKey: string
  host: string
  projectId: string
  endpoint: string
}

export function parseDsn(dsn: string): SentryParsedDsn | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const host = url.host
    const pathParts = url.pathname.split('/').filter(Boolean)
    const projectId = pathParts[0]

    if (!publicKey || !host || !projectId) {
      return null
    }

    return {
      publicKey,
      host,
      projectId,
      endpoint: `https://${host}/api/${projectId}/store/`,
    }
  } catch {
    return null
  }
}

export type ErrorPayload = {
  event_id: string
  timestamp: string
  level: string
  platform: string
  release: string
  environment: string
  exception: {
    values: Array<{
      type: string
      value: string
      stacktrace?: { frames: Array<{ filename: string; lineno: number; function: string }> }
    }>
  }
  tags: Record<string, string>
  extra: Record<string, unknown>
  user?: { id: string | number }
}

export function buildSentryPayload(error: unknown, ctx?: HttpContext): ErrorPayload {
  const err = error instanceof Error ? error : new Error(String(error))
  const eventId = crypto.randomUUID().replace(/-/g, '')
  const timestamp = new Date().toISOString()
  const release = '2.0.0-dev'
  const environment = env.get('SENTRY_ENVIRONMENT') || env.get('NODE_ENV') || 'development'

  const payload: ErrorPayload = {
    event_id: eventId,
    timestamp,
    level: 'error',
    platform: 'node',
    release,
    environment,
    exception: {
      values: [
        {
          type: err.name || 'Error',
          value: err.message || 'Unknown error',
        },
      ],
    },
    tags: {
      release,
      environment,
    },
    extra: {},
  }

  if (ctx) {
    payload.extra.method = ctx.request.method()
    payload.extra.url = ctx.request.url()
    payload.extra.requestId = ctx.request.id()

    if (ctx.auth?.user?.id) {
      payload.user = { id: ctx.auth.user.id }
    }
  }

  return payload
}

type SentryTransport = (
  endpoint: string,
  headers: Record<string, string>,
  body: string
) => Promise<boolean>

let customTransport: SentryTransport | null = null

export function setCustomTransport(transport: SentryTransport | null) {
  customTransport = transport
}

export async function captureException(error: unknown, ctx?: HttpContext): Promise<boolean> {
  const dsn = env.get('SENTRY_DSN')
  if (!dsn && !customTransport) {
    return false
  }

  const parsed = dsn ? parseDsn(dsn) : null
  if (!parsed && !customTransport) {
    return false
  }

  const payload = buildSentryPayload(error, ctx)
  const body = JSON.stringify(payload)

  const endpoint = parsed?.endpoint || 'https://sentry.mock/api/0/store/'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=music-class/2.0.0, sentry_key=${parsed?.publicKey || 'mock'}`,
  }

  try {
    if (customTransport) {
      return await customTransport(endpoint, headers, body)
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })

    return response.ok
  } catch (err) {
    // Fail silently in monitoring to avoid cascading crashes
    if (ctx?.logger) {
      ctx.logger.debug({ err }, 'Failed to deliver error to Sentry')
    }
    return false
  }
}
