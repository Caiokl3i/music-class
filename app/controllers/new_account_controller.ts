import User from '#models/user'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { ACCESS_TOKEN_EXPIRES_IN } from '#services/access_tokens'
import { ensureDefaultPlanTypes } from '#services/plan_types'
import { logSecurityEvent } from '#services/security_log'
import { assertSignupInvite } from '#services/signup_invite'

export default class NewAccountController {
  async store({ request, serialize, logger }: HttpContext) {
    const inviteCode = request.input('inviteCode')
    try {
      assertSignupInvite(
        typeof inviteCode === 'string' ? inviteCode : undefined,
        env.get('SIGNUP_INVITE_CODE')
      )
    } catch (error) {
      logSecurityEvent(logger, 'warn', 'auth.signup.denied', {
        reason: error instanceof Error ? error.message : 'invite',
      })
      throw error
    }

    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await db.transaction(async (trx) => {
      const created = await User.create({ fullName, email, password }, { client: trx })
      await ensureDefaultPlanTypes(created, trx)
      return created
    })
    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    })

    logSecurityEvent(logger, 'info', 'auth.signup.success', {
      userId: user.id,
      email: user.email,
    })

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
