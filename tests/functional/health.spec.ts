import { test } from '@japa/runner'

test.group('Health', () => {
  test('returns a generic ok payload', async ({ client }) => {
    const response = await client.get('/')
    response.assertStatus(200)
    response.assertBody({ ok: true })
  })

  test('returns database connected and healthy on /health', async ({ client }) => {
    const response = await client.get('/health')
    response.assertStatus(200)
    response.assertBodyContains({
      status: 'ok',
      healthy: true,
      database: 'connected',
    })
  })

  test('includes x-request-id header in HTTP responses', async ({ assert, client }) => {
    const response = await client.get('/health')
    const requestId = response.header('x-request-id')
    assert.isDefined(requestId)
    assert.isString(requestId)
  })
})
