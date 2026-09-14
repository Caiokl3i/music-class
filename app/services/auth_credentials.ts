import { createError } from '@adonisjs/core/exceptions'
import hash from '@adonisjs/core/services/hash'
import User from '#models/user'

export const ACCOUNT_NOT_FOUND = createError(
  'No account exists with this email',
  'E_ACCOUNT_NOT_FOUND',
  400
)

export const INVALID_PASSWORD = createError('Incorrect password', 'E_INVALID_PASSWORD', 400)

export const INVALID_CURRENT_PASSWORD = createError(
  'Current password is incorrect',
  'E_INVALID_CURRENT_PASSWORD',
  400
)

export async function findUserByLoginEmail(email: string) {
  const trimmed = email.trim()
  if (!trimmed) {
    return null
  }

  return User.query().whereRaw('lower(email) = ?', [trimmed.toLowerCase()]).first()
}

export async function authenticateLogin(email: string, password: string) {
  const user = await findUserByLoginEmail(email)
  if (!user) {
    throw new ACCOUNT_NOT_FOUND()
  }

  const matches = await hash.verify(user.password, password)
  if (!matches) {
    throw new INVALID_PASSWORD()
  }

  return user
}

export async function assertCurrentPassword(user: User, password: string) {
  const matches = await hash.verify(user.password, password)
  if (!matches) {
    throw new INVALID_CURRENT_PASSWORD()
  }
}
