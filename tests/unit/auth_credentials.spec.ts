import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  ACCOUNT_NOT_FOUND,
  INVALID_CURRENT_PASSWORD,
  INVALID_PASSWORD,
  assertCurrentPassword,
  authenticateLogin,
} from '#services/auth_credentials'
import { createTeacher } from '#tests/helpers'

test.group('Auth credentials', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('tells a missing account apart from a wrong password', async ({ assert }) => {
    await createTeacher({ email: 'teacher@example.com' })

    await assert.rejects(
      () => authenticateLogin('nobody@example.com', 'password123'),
      ACCOUNT_NOT_FOUND
    )
    await assert.rejects(
      () => authenticateLogin('teacher@example.com', 'wrong-password'),
      INVALID_PASSWORD
    )

    const user = await authenticateLogin('Teacher@example.com', 'password123')
    assert.equal(user.email, 'teacher@example.com')
  })

  test('rejects the current password when it does not match', async ({ assert }) => {
    const teacher = await createTeacher()

    await assert.rejects(
      () => assertCurrentPassword(teacher, 'wrong-password'),
      INVALID_CURRENT_PASSWORD
    )
    await assert.doesNotReject(() => assertCurrentPassword(teacher, 'password123'))
  })
})
