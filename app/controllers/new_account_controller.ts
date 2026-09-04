import User from '#models/user'
import env from '#start/env'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import { ACCESS_TOKEN_EXPIRES_IN } from '#services/access_tokens'
import { ensureDefaultPlanTypes } from '#services/plan_types'
import { assertSignupInvite } from '#services/signup_invite'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const { fullName, email, password, inviteCode } = await request.validateUsing(signupValidator)
    assertSignupInvite(inviteCode, env.get('SIGNUP_INVITE_CODE'))

    const user = await User.create({ fullName, email, password })
    await ensureDefaultPlanTypes(user)
    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    })

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
