import { createHash, timingSafeEqual } from 'node:crypto'
import { createError } from '@adonisjs/core/exceptions'

export const SIGNUP_CLOSED = createError('Signup is closed', 'E_SIGNUP_CLOSED', 403)

export const INVITE_REQUIRED = createError('Invite code is required', 'E_INVITE_REQUIRED', 403)

export const INVALID_INVITE = createError('Invalid invite code', 'E_INVALID_INVITE', 403)

function digest(value: string) {
  return createHash('sha256').update(value).digest()
}

function inviteMatches(provided: string, expected: string) {
  return timingSafeEqual(digest(provided), digest(expected))
}

export function assertSignupInvite(provided: string | undefined, expected: string | undefined) {
  const secret = expected?.trim()
  if (!secret) {
    throw new SIGNUP_CLOSED()
  }

  const code = provided?.trim()
  if (!code) {
    throw new INVITE_REQUIRED()
  }

  if (!inviteMatches(code, secret)) {
    throw new INVALID_INVITE()
  }
}
