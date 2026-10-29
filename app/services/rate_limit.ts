import { createError } from '@adonisjs/core/exceptions'
import env from '#start/env'
import { isPostgres } from '#database/connection'
import db from '@adonisjs/lucid/services/db'

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

export type RateLimitResult = {
  limited: boolean
  remaining: number
  resetAt: number
}

export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule): RateLimitResult | Promise<RateLimitResult>
  reset(): void | Promise<void>
}

/**
 * Limits sized to the abuse risk of each operation, not a single global cap.
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

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>()

  consume(key: string, rule: RateLimitRule): RateLimitResult {
    this.pruneExpired()

    const now = Date.now()
    const windowMs = rule.windowMinutes * 60_000
    const current = this.buckets.get(key)

    if (!current || current.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs }
      this.buckets.set(key, next)
      return { limited: false, remaining: rule.max - 1, resetAt: next.resetAt }
    }

    if (current.count >= rule.max) {
      return { limited: true, remaining: 0, resetAt: current.resetAt }
    }

    current.count += 1
    return { limited: false, remaining: rule.max - current.count, resetAt: current.resetAt }
  }

  reset() {
    this.buckets.clear()
  }

  private pruneExpired() {
    const now = Date.now()
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key)
      }
    }

    if (this.buckets.size <= MAX_BUCKETS) {
      return
    }

    const extra = this.buckets.size - MAX_BUCKETS
    let removed = 0
    for (const key of this.buckets.keys()) {
      this.buckets.delete(key)
      removed += 1
      if (removed >= extra) {
        break
      }
    }
  }
}

export class DatabaseRateLimitStore implements RateLimitStore {
  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = rule.windowMinutes * 60_000
    const resetAt = now + windowMs

    if (isPostgres()) {
      const result = await db.rawQuery(
        `
        INSERT INTO rate_limit_buckets (key, count, reset_at, updated_at)
        VALUES (?, 1, ?, NOW())
        ON CONFLICT (key) DO UPDATE
        SET count = CASE
              WHEN rate_limit_buckets.reset_at <= ? THEN 1
              ELSE rate_limit_buckets.count + 1
            END,
            reset_at = CASE
              WHEN rate_limit_buckets.reset_at <= ? THEN ?
              ELSE rate_limit_buckets.reset_at
            END,
            updated_at = NOW()
        RETURNING count, reset_at;
        `,
        [key, resetAt, now, now, resetAt]
      )

      const row = result.rows?.[0] || result[0]
      const count = Number(row.count)
      const bucketResetAt = Number(row.reset_at)

      const limited = count > rule.max
      const remaining = Math.max(0, rule.max - count)
      return { limited, remaining, resetAt: bucketResetAt }
    }

    // Generic transaction fallback for sqlite / other dialects
    return await db.transaction(async (trx) => {
      const row = await trx.from('rate_limit_buckets').where('key', key).first()
      if (!row || Number(row.reset_at) <= now) {
        const next = { key, count: 1, reset_at: resetAt }
        if (row) {
          await trx.from('rate_limit_buckets').where('key', key).update(next)
        } else {
          await trx.table('rate_limit_buckets').insert(next)
        }
        return { limited: false, remaining: rule.max - 1, resetAt }
      }

      const count = Number(row.count) + 1
      await trx.from('rate_limit_buckets').where('key', key).update({ count })
      const limited = count > rule.max
      const remaining = Math.max(0, rule.max - count)
      return { limited, remaining, resetAt: Number(row.reset_at) }
    })
  }

  async reset(): Promise<void> {
    await db.from('rate_limit_buckets').delete()
  }
}

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string
  ) {}

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const windowSeconds = rule.windowMinutes * 60
    const redisKey = `ratelimit:${key}`

    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSeconds, 'NX'],
        ['TTL', redisKey],
      ]),
    })

    if (!response.ok) {
      throw new Error(`Upstash RateLimit error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as Array<{ result: number }>
    const count = data[0]?.result ?? 1
    const ttlSeconds = data[2]?.result ?? windowSeconds
    const resetAt = Date.now() + Math.max(0, ttlSeconds) * 1000

    const limited = count > rule.max
    const remaining = Math.max(0, rule.max - count)

    return { limited, remaining, resetAt }
  }

  async reset(): Promise<void> {
    // Pipeline flush not required in testing; individual keys expire naturally
  }
}

const memoryStore = new MemoryRateLimitStore()
let customStore: RateLimitStore | null = null

export function setRateLimitStore(store: RateLimitStore | null) {
  customStore = store
}

export function resolveRateLimitStore(): RateLimitStore {
  if (customStore) {
    return customStore
  }

  const upstashUrl = env.get('UPSTASH_REDIS_REST_URL')
  const upstashToken = env.get('UPSTASH_REDIS_REST_TOKEN')

  if (upstashUrl && upstashToken) {
    return new UpstashRateLimitStore(upstashUrl, upstashToken)
  }

  if (isPostgres() && env.get('NODE_ENV') !== 'test') {
    return new DatabaseRateLimitStore()
  }

  return memoryStore
}

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

export function resetRateLimits(): void | Promise<void> {
  const store = resolveRateLimitStore()
  return store.reset()
}

export function consumeRateLimit(
  key: string,
  rule: RateLimitRule
): RateLimitResult | Promise<RateLimitResult> {
  if (!enabled) {
    return {
      limited: false,
      remaining: rule.max,
      resetAt: Date.now() + rule.windowMinutes * 60_000,
    }
  }

  const store = resolveRateLimitStore()
  return store.consume(key, rule)
}
