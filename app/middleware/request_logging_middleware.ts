import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Structured request logging for serverless environments.
 * Correlates each request with a unique x-request-id and ensures
 * zero PII / sensitive bodies are leaked to log aggregators.
 */
export default class RequestLoggingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const requestId = ctx.request.id() || crypto.randomUUID()
    ctx.response.header('x-request-id', requestId)
    ctx.logger = ctx.logger.child({ requestId })

    const start = performance.now()

    try {
      await next()
    } finally {
      const durationMs = Math.round(performance.now() - start)
      const status = ctx.response.getStatus()

      ctx.logger.info(
        {
          http: {
            method: ctx.request.method(),
            url: ctx.request.url(),
            status,
            durationMs,
          },
        },
        `${ctx.request.method()} ${ctx.request.url()} ${status} - ${durationMs}ms`
      )
    }
  }
}
