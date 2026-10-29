/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import {
  MemoryRateLimitStore,
  UpstashRateLimitStore,
  type RateLimitRule,
} from '#services/rate_limit'

test.group('Shared rate limit stores', () => {
  test('MemoryRateLimitStore respects limits and resets', ({ assert }) => {
    const store = new MemoryRateLimitStore()
    const rule: RateLimitRule = { name: 'test-mem', max: 2, windowMinutes: 10 }

    const first = store.consume('user-1', rule)
    assert.isFalse(first.limited)
    assert.equal(first.remaining, 1)

    const second = store.consume('user-1', rule)
    assert.isFalse(second.limited)
    assert.equal(second.remaining, 0)

    const third = store.consume('user-1', rule)
    assert.isTrue(third.limited)
    assert.equal(third.remaining, 0)

    store.reset()

    const afterReset = store.consume('user-1', rule)
    assert.isFalse(afterReset.limited)
    assert.equal(afterReset.remaining, 1)
  })

  test('UpstashRateLimitStore sends pipeline commands to HTTP REST', async ({ assert }) => {
    // Mock global fetch for testing Upstash pipeline
    const originalFetch = globalThis.fetch
    let capturedBody: unknown = null
    let capturedHeaders: HeadersInit | undefined = undefined

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers
      capturedBody = JSON.parse(init?.body as string)
      return {
        ok: true,
        json: async () => [{ result: 1 }, { result: 1 }, { result: 590 }],
      } as Response
    }) as typeof fetch

    try {
      const store = new UpstashRateLimitStore('https://fake-redis.upstash.io', 'fake-token')
      const rule: RateLimitRule = { name: 'test-upstash', max: 5, windowMinutes: 10 }

      const result = await store.consume('ip-123', rule)
      assert.isFalse(result.limited)
      assert.equal(result.remaining, 4)

      assert.deepEqual(capturedBody, [
        ['INCR', 'ratelimit:ip-123'],
        ['EXPIRE', 'ratelimit:ip-123', 600, 'NX'],
        ['TTL', 'ratelimit:ip-123'],
      ])
      const headers = capturedHeaders as unknown as Record<string, string>
      assert.equal(headers['Authorization'], 'Bearer fake-token')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
