import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
function resolveCorsOrigin(origin: string): boolean {
  if (app.inDev) {
    return true
  }

  const allowedOrigins = env
    .get('CORS_ORIGIN', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Allow preview deployments on Vercel when enabled
  if (
    env.get('ALLOW_VERCEL_PREVIEW') === 'true' &&
    /^https:\/\/[a-z0-9-]+.*\.vercel\.app$/.test(origin)
  ) {
    return true
  }

  return false
}

const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  /**
   * Dynamically resolves allowed origins based on CORS_ORIGIN and Vercel preview settings.
   */
  origin: resolveCorsOrigin,

  /**
   * HTTP methods accepted for cross-origin requests.
   */
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],

  /**
   * Reflect request headers by default. Use a string array to restrict
   * allowed headers.
   */
  headers: true,

  /**
   * Response headers exposed to the browser.
   */
  exposeHeaders: [],

  /**
   * Allow cookies/authorization headers on cross-origin requests.
   */
  credentials: true,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
