/**
 * Frontend Error Monitoring & Sentry Integration
 * Non-blocking client-side error reporter for unhandled exceptions.
 */

type SentryParsed = {
  publicKey: string
  host: string
  projectId: string
  endpoint: string
}

function parseDsn(dsn: string): SentryParsed | null {
  try {
    const url = new URL(dsn)
    const publicKey = url.username
    const host = url.host
    const projectId = url.pathname.replace(/^\//, '')

    if (!publicKey || !host || !projectId) return null

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

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  const parsed = parseDsn(dsn)
  if (!parsed) return

  window.addEventListener('error', (event) => {
    captureFrontendException(event.error || event.message, parsed)
  })

  window.addEventListener('unhandledrejection', (event) => {
    captureFrontendException(event.reason, parsed)
  })
}

export async function captureFrontendException(
  error: unknown,
  parsedDsn?: SentryParsed | null
): Promise<boolean> {
  const dsn = parsedDsn || parseDsn(import.meta.env.VITE_SENTRY_DSN || '')
  if (!dsn) return false

  const err = error instanceof Error ? error : new Error(String(error))
  const eventId = crypto.randomUUID().replace(/-/g, '')

  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    level: 'error',
    platform: 'javascript',
    release: '2.0.0-dev',
    environment: import.meta.env.MODE || 'production',
    exception: {
      values: [
        {
          type: err.name || 'Error',
          value: err.message || 'Unknown frontend error',
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split('\n')
                  .slice(1, 10)
                  .map((line) => ({ filename: line.trim(), lineno: 0, function: '?' })),
              }
            : undefined,
        },
      ],
    },
    tags: {
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
  }

  try {
    const res = await fetch(dsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=music-class-front/2.0.0, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    // Fail silently in monitoring
    return false
  }
}
