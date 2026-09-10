import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Headers Shield does not emit. CSP stays off here: this process only serves JSON.
 */
export default class SecurityHeadersMiddleware {
  handle({ response }: HttpContext, next: NextFn) {
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.header('X-Permitted-Cross-Domain-Policies', 'none')
    return next()
  }
}
