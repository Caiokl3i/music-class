import UserTransformer from '#transformers/user_transformer'
import { updatePasswordValidator, updateProfileValidator } from '#validators/user'
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
    await user.save()

    return serialize(UserTransformer.transform(user))
  }

  async updatePassword({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updatePasswordValidator)

    await User.verifyCredentials(user.email, payload.currentPassword)
    user.password = payload.password
    await user.save()

    return { message: 'Password updated successfully' }
  }
}
