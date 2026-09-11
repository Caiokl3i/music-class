import { createError } from '@adonisjs/core/exceptions'
import env from '#start/env'

export const TOO_MANY_REQUESTS = createError(
  'Too many requests. Try again later.',
  'E_TOO_MANY_REQUESTS',
  429
)

export type RateLimitRule = {
  name: string
  max: number
  windowMinutes: number
}

/**
 * Limits sized to the abuse risk of each operation, not a single global cap.
 * In-memory store: correct for the current single-process SQLite deploy.
 */
export const RATE_LIMITS = {
  login: { name: 'login', max: 10, windowMinutes: 15 },
  loginEmail: { name: 'login-email', max: 15, windowMinutes: 15 },
  signup: { name: 'signup', max: 5, windowMinutes: 15 },
  password: { name: 'password', max: 5, windowMinutes: 15 },
  export: { name: 'export', max: 15, windowMinutes: 15 },
  generate: { name: 'generate', max: 10, windowMinutes: 15 },
  backupEmail: { name: 'backup-email', max: 3, windowMinutes: 60 },
  api: { name: 'api', max: 240, windowMinutes: 15 },
} satisfies Record<string, RateLimitRule>

type Bucket = {
  count: number
  resetAt: number
}

const MAX_BUCKETS = 10_000
const buckets = new Map<string, Bucket>()

function readEnabled() {
  const raw = env.get('RATE_LIMIT_ENABLED')
  if (raw === '0' || raw === 'false') {
    return false
  }
  if (raw === '1' || raw === 'true') {
    return true
  }
  return env.get('NODE_ENV') !== 'test'
}

let enabled = readEnabled()

export function isRateLimitEnabled() {
  return enabled
}

export function setRateLimitEnabled(value: boolean) {
  enabled = value
}

export function resetRateLimits() {
  buckets.clear()
}

export function consumeRateLimit(key: string, rule: RateLimitRule) {
  if (!enabled) {
    return {
      limited: false,
      remaining: rule.max,
      resetAt: Date.now() + rule.windowMinutes * 60_000,
    }
  }

  pruneExpired()

  const now = Date.now()
  const windowMs = rule.windowMinutes * 60_000
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs }
    buckets.set(key, next)
    return { limited: false, remaining: rule.max - 1, resetAt: next.resetAt }
  }

  if (current.count >= rule.max) {
    return { limited: true, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  return { limited: false, remaining: rule.max - current.count, resetAt: current.resetAt }
}

function pruneExpired() {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return
  }

  const extra = buckets.size - MAX_BUCKETS
  let removed = 0
  for (const key of buckets.keys()) {
    buckets.delete(key)
    removed += 1
    if (removed >= extra) {
      break
    }
  }
}
