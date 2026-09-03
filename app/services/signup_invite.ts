import { createError } from '@adonisjs/core/exceptions'

export const SIGNUP_CLOSED = createError('Signup is closed', 'E_SIGNUP_CLOSED', 403)

export const INVALID_INVITE = createError('Invalid invite code', 'E_INVALID_INVITE', 403)

export function assertSignupInvite(provided: string | undefined, expected: string | undefined) {
  const secret = expected?.trim()
  if (!secret) {
    throw new SIGNUP_CLOSED()
  }

  if (!provided || provided.trim() !== secret) {
    throw new INVALID_INVITE()
  }
}
