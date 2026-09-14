import UserTransformer from '#transformers/user_transformer'
import { updatePasswordValidator, updateProfileValidator } from '#validators/user'
import { revokeOtherAccessTokens } from '#services/access_tokens'
import { emailSqliteBackup } from '#services/backup_email'
import { assertCurrentPassword } from '#services/auth_credentials'
import { logSecurityEvent } from '#services/security_log'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateProfileValidator)

    user.fullName = payload.fullName
    if (payload.phone !== undefined) user.phone = payload.phone
    if (payload.studioName !== undefined) user.studioName = payload.studioName
    if (payload.city !== undefined) user.city = payload.city
    if (payload.instruments !== undefined) user.instruments = payload.instruments
    if (payload.bio !== undefined) user.bio = payload.bio
    await user.save()

    return serialize(UserTransformer.transform(user))
  }

  async updatePassword({ auth, request, logger }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updatePasswordValidator)

    try {
      await assertCurrentPassword(user, payload.currentPassword)
    } catch (error) {
      logSecurityEvent(logger, 'warn', 'auth.password.failure', { userId: user.id })
      throw error
    }

    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      user.password = payload.password
      await user.save()
      await revokeOtherAccessTokens(user, trx)
    })
    logSecurityEvent(logger, 'info', 'auth.password.changed', { userId: user.id })

    return { message: 'Password updated successfully' }
  }

  async emailBackup({ auth, logger }: HttpContext) {
    const user = auth.getUserOrFail()
    const result = await emailSqliteBackup()
    logSecurityEvent(logger, 'info', 'backup.email.sent', { userId: user.id })
    return { message: 'Backup sent', to: result.to, filename: result.filename }
  }
}
