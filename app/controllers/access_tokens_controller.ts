import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { ACCESS_TOKEN_EXPIRES_IN } from '#services/access_tokens'
import { logSecurityEvent } from '#services/security_log'

export default class AccessTokensController {
  async store({ request, serialize, logger }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    try {
      const user = await User.verifyCredentials(email, password)
      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      })

      logSecurityEvent(logger, 'info', 'auth.login.success', {
        userId: user.id,
        email: user.email,
      })

      return serialize({
        user: UserTransformer.transform(user),
        token: token.value!.release(),
      })
    } catch (error) {
      logSecurityEvent(logger, 'warn', 'auth.login.failure', { email })
      throw error
    }
  }

  async destroy({ auth, logger }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    logSecurityEvent(logger, 'info', 'auth.logout', { userId: user.id })

    return {
      message: 'Logged out successfully',
    }
  }
}
