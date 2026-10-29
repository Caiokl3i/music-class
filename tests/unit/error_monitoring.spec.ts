/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import {
  parseDsn,
  buildSentryPayload,
  captureException,
  setCustomTransport,
} from '#services/error_monitoring'

test.group('Error monitoring (Sentry)', (group) => {
  group.each.teardown(() => {
    setCustomTransport(null)
  })

  test('parses standard Sentry DSN correctly', ({ assert }) => {
    const dsn = 'https://abcdef123456@o123456.ingest.sentry.io/7890123'
    const parsed = parseDsn(dsn)

    assert.isNotNull(parsed)
    assert.equal(parsed?.publicKey, 'abcdef123456')
    assert.equal(parsed?.host, 'o123456.ingest.sentry.io')
    assert.equal(parsed?.projectId, '7890123')
    assert.equal(parsed?.endpoint, 'https://o123456.ingest.sentry.io/api/7890123/store/')
  })

  test('returns null for invalid DSN strings', ({ assert }) => {
    assert.isNull(parseDsn('invalid-url'))
    assert.isNull(parseDsn('https://missing-user.com/123'))
  })

  test('builds structured Sentry payload with error metadata', ({ assert }) => {
    const error = new Error('Test application crash')
    const payload = buildSentryPayload(error)

    assert.equal(payload.level, 'error')
    assert.equal(payload.platform, 'node')
    assert.equal(payload.release, '2.0.0-dev')
    assert.equal(payload.exception.values[0].type, 'Error')
    assert.equal(payload.exception.values[0].value, 'Test application crash')
  })

  test('delivers error via transport without throwing', async ({ assert }) => {
    let capturedBody: string | null = null

    setCustomTransport(async (_endpoint, _headers, body) => {
      capturedBody = body
      return true
    })

    const delivered = await captureException(new Error('Mock failure'))
    assert.isTrue(delivered)
    assert.isNotNull(capturedBody)
    assert.include(capturedBody!, 'Mock failure')
  })
})
