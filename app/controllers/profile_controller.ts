import UserTransformer from '#transformers/user_transformer'
import { updatePasswordValidator, updateProfileValidator } from '#validators/user'
import { revokeOtherAccessTokens } from '#services/access_tokens'
import { logSecurityEvent } from '#services/security_log'
import User from '#models/user'
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
      await User.verifyCredentials(user.email, payload.currentPassword)
    } catch (error) {
      logSecurityEvent(logger, 'warn', 'auth.password.failure', { userId: user.id })
      throw error
    }

    user.password = payload.password
    await user.save()
    await revokeOtherAccessTokens(user)
    logSecurityEvent(logger, 'info', 'auth.password.changed', { userId: user.id })

    return { message: 'Password updated successfully' }
  }
}
