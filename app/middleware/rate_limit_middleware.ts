import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  consumeRateLimit,
  RATE_LIMITS,
  TOO_MANY_REQUESTS,
  type RateLimitRule,
} from '#services/rate_limit'

/**
 * Fixed-window limiter. Group middleware (auth) runs first, so authenticated
 * routes can also key on the teacher id.
 */
export default class RateLimitMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: RateLimitRule = RATE_LIMITS.login
  ) {
    const ip = ctx.request.ip()
    this.assertAllowed(ctx, consumeRateLimit(`${options.name}:ip:${ip}`, options), options)

    if (options.name === RATE_LIMITS.login.name) {
      const email = ctx.request.input('email')
      if (typeof email === 'string' && email.includes('@')) {
        this.assertAllowed(
          ctx,
          consumeRateLimit(
            `${RATE_LIMITS.loginEmail.name}:${email.trim().toLowerCase()}`,
            RATE_LIMITS.loginEmail
          ),
          RATE_LIMITS.loginEmail
        )
      }
    }

    const user = ctx.auth.user
    if (user) {
      this.assertAllowed(
        ctx,
        consumeRateLimit(`${options.name}:user:${user.id}`, options),
        options
      )
    }

    return next()
  }

  private assertAllowed(
    ctx: HttpContext,
    consumed: { limited: boolean; remaining: number; resetAt: number },
    options: RateLimitRule
  ) {
    ctx.response.header('X-RateLimit-Limit', String(options.max))
    ctx.response.header('X-RateLimit-Remaining', String(Math.max(consumed.remaining, 0)))
    ctx.response.header('X-RateLimit-Reset', String(Math.ceil(consumed.resetAt / 1000)))

    if (consumed.limited) {
      const retryAfter = Math.max(1, Math.ceil((consumed.resetAt - Date.now()) / 1000))
      ctx.response.header('Retry-After', String(retryAfter))
      throw new TOO_MANY_REQUESTS()
    }
  }
}
