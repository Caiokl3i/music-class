import db from '@adonisjs/lucid/services/db'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export const ACCESS_TOKEN_EXPIRES_IN = '7 days'

export async function revokeOtherAccessTokens(user: User, trx?: TransactionClientContract) {
  const currentId = user.currentAccessToken?.identifier
  const query = (trx ?? db).from('auth_access_tokens').where('tokenable_id', user.id)
  if (currentId !== undefined && currentId !== null) {
    query.whereNot('id', Number(currentId))
  }
  await query.delete()
}
