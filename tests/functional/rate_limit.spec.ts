import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { RATE_LIMITS, resetRateLimits, setRateLimitEnabled } from '#services/rate_limit'
import { createTeacher } from '#tests/helpers'

test.group('Auth rate limit', (group) => {
  group.each.setup(() => {
    setRateLimitEnabled(true)
    resetRateLimits()
    return () => {
      setRateLimitEnabled(false)
      resetRateLimits()
    }
  })

  group.each.setup(() => testUtils.db().truncate())

  test('throttles repeated failed logins from the same client', async ({ client }) => {
    await createTeacher()

    for (let i = 0; i < RATE_LIMITS.login.max; i++) {
      const attempt = await client.post('/api/v1/auth/login').json({
        email: 'teacher@example.com',
        password: 'wrong-pass',
      })
      attempt.assertStatus(400)
    }

    const blocked = await client.post('/api/v1/auth/login').json({
      email: 'teacher@example.com',
      password: 'wrong-pass',
    })
    blocked.assertStatus(429)
    blocked.assertBodyContains({ code: 'E_TOO_MANY_REQUESTS' })
  })
})
