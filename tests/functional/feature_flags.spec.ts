import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { createTeacher } from '#tests/helpers'

test.group('GET /api/v1/features', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication and returns boolean feature map for active studio', async ({
    assert,
    client,
  }) => {
    const unauthRes = await client.get('/api/v1/features')
    unauthRes.assertStatus(401)

    process.env.FEATURE_TEST_V2_BANNER = 'true'
    process.env.FEATURE_TEST_V2_BETA = '0'

    try {
      const teacher = await createTeacher()
      const token = await User.accessTokens.create(teacher)

      const res = await client
        .get('/api/v1/features')
        .header('Authorization', `Bearer ${token.value!.release()}`)

      res.assertStatus(200)
      const features = res.body()?.data?.features
      assert.isObject(features)
      assert.equal(features.test_v2_banner, true)
      assert.equal(features.test_v2_beta, false)
    } finally {
      delete process.env.FEATURE_TEST_V2_BANNER
      delete process.env.FEATURE_TEST_V2_BETA
    }
  })
})
