import { test } from '@japa/runner'
import { assertSignupInvite, INVALID_INVITE, SIGNUP_CLOSED } from '#services/signup_invite'

test.group('Signup invite', () => {
  test('rejects signup when no invite is configured', ({ assert }) => {
    assert.throws(() => assertSignupInvite('qualquer', undefined), SIGNUP_CLOSED)
    assert.throws(() => assertSignupInvite('qualquer', '   '), SIGNUP_CLOSED)
  })

  test('rejects a missing or wrong code', ({ assert }) => {
    assert.throws(() => assertSignupInvite(undefined, 'segredo'), INVALID_INVITE)
    assert.throws(() => assertSignupInvite('outro', 'segredo'), INVALID_INVITE)
  })

  test('accepts the configured code, ignoring surrounding spaces', ({ assert }) => {
    assert.doesNotThrow(() => assertSignupInvite('segredo', 'segredo'))
    assert.doesNotThrow(() => assertSignupInvite('  segredo  ', 'segredo'))
  })
})
