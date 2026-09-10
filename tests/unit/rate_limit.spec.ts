import { test } from '@japa/runner'
import {
  RATE_LIMITS,
  consumeRateLimit,
  resetRateLimits,
  setRateLimitEnabled,
} from '#services/rate_limit'

test.group('Rate limit', (group) => {
  group.each.setup(() => {
    setRateLimitEnabled(true)
    resetRateLimits()
    return () => {
      setRateLimitEnabled(false)
      resetRateLimits()
    }
  })

  test('allows requests under the max and then marks the key limited', ({ assert }) => {
    const rule = { name: 'test', max: 2, windowMinutes: 15 }

    assert.isFalse(consumeRateLimit('k', rule).limited)
    assert.isFalse(consumeRateLimit('k', rule).limited)
    assert.isTrue(consumeRateLimit('k', rule).limited)
  })

  test('keeps separate counters per key', ({ assert }) => {
    const rule = RATE_LIMITS.login

    for (let i = 0; i < rule.max; i++) {
      assert.isFalse(consumeRateLimit('ip-a', rule).limited)
    }

    assert.isTrue(consumeRateLimit('ip-a', rule).limited)
    assert.isFalse(consumeRateLimit('ip-b', rule).limited)
  })

  test('defines a general authenticated api cap', ({ assert }) => {
    assert.equal(RATE_LIMITS.api.max, 240)
    assert.equal(RATE_LIMITS.api.windowMinutes, 15)
  })

  test('does not increment when disabled', ({ assert }) => {
    setRateLimitEnabled(false)
    const rule = { name: 'off', max: 1, windowMinutes: 15 }

    assert.isFalse(consumeRateLimit('k', rule).limited)
    assert.isFalse(consumeRateLimit('k', rule).limited)
  })
})
