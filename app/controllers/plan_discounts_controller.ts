import PlanDiscountTransformer from '#transformers/plan_discount_transformer'
import {
  createPlanDiscountValidator,
  updatePlanDiscountValidator,
} from '#validators/plan_discount'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import PlanDiscount from '#models/plan_discount'

export default class PlanDiscountsController {
  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const plan = await this.findOwnedPlan(user, params.planId)
    const payload = await request.validateUsing(createPlanDiscountValidator)

    const discount = await plan.related('discounts').create({
      userId: user.id,
      name: payload.name,
      amount: payload.amount,
      serviceAt: payload.serviceAt ?? null,
      notes: payload.notes ?? null,
    })

    response.status(201)
    return serialize(PlanDiscountTransformer.transform(discount))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const discount = await this.findOwnedDiscount(user, params.planId, params.id)
    const payload = await request.validateUsing(updatePlanDiscountValidator)

    if (payload.name !== undefined) discount.name = payload.name
    if (payload.amount !== undefined) discount.amount = payload.amount
    if (payload.serviceAt !== undefined) discount.serviceAt = payload.serviceAt
    if (payload.notes !== undefined) discount.notes = payload.notes

    await discount.save()
    return serialize(PlanDiscountTransformer.transform(discount))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const discount = await this.findOwnedDiscount(
      auth.getUserOrFail(),
      params.planId,
      params.id
    )
    await discount.delete()
    return response.noContent()
  }

  private findOwnedPlan(user: User, planId: number | string) {
    return user.related('plans').query().where('id', planId).firstOrFail()
  }

  private findOwnedDiscount(user: User, planId: number | string, id: number | string) {
    return PlanDiscount.query()
      .where('id', id)
      .where('planId', planId)
      .where('userId', user.id)
      .firstOrFail()
  }
}
