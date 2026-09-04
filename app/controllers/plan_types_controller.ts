import PlanTypeTransformer from '#transformers/plan_type_transformer'
import { createPlanTypeValidator, updatePlanTypeValidator } from '#validators/plan_type'
import {
  assertPlanTypeUnused,
  ensureDefaultPlanTypes,
  findOwnedPlanType,
  listPlanTypes,
  nextSortOrder,
  uniqueSlug,
} from '#services/plan_types'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export default class PlanTypesController {
  async index({ auth, serialize }: HttpContext) {
    return serialize(PlanTypeTransformer.transform(await listPlanTypes(auth.getUserOrFail())))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createPlanTypeValidator)
    await ensureDefaultPlanTypes(user)

    const type = await user.related('planTypes').create({
      slug: await uniqueSlug(user, payload.label),
      label: payload.label,
      lessons: payload.lessons,
      price: payload.price,
      sortOrder: await nextSortOrder(user),
    })

    response.status(201)
    return serialize(PlanTypeTransformer.transform(await this.reload(user, type.id)))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const type = await findOwnedPlanType(auth.getUserOrFail(), params.id)
    return serialize(PlanTypeTransformer.transform(type))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const type = await findOwnedPlanType(user, params.id)
    const payload = await request.validateUsing(updatePlanTypeValidator)

    type.merge(payload)
    await type.save()

    return serialize(PlanTypeTransformer.transform(await this.reload(user, type.id)))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const type = await findOwnedPlanType(user, params.id)
    await assertPlanTypeUnused(user, type.slug)
    await type.delete()

    return response.noContent()
  }

  private reload(user: User, id: number) {
    return findOwnedPlanType(user, id)
  }
}
