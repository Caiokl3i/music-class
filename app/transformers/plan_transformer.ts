import type Plan from '#models/plan'
import type PlanDiscount from '#models/plan_discount'
import PlanDiscountTransformer from '#transformers/plan_discount_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'
import {
  remainingCreditsFromCount,
  lessonsDoneFromExtras,
  activeLessonsFromExtras,
} from '#services/plan_credits'
import { discountTotalFromList, netPriceFromPlan } from '#services/plan_pricing'

export default class PlanTransformer extends BaseTransformer<Plan> {
  toObject() {
    const done = lessonsDoneFromExtras(this.resource)
    const active = activeLessonsFromExtras(this.resource)
    const discounts = (this.resource.$preloaded.discounts as PlanDiscount[] | undefined) ?? []
    const discountTotal = discountTotalFromList(discounts)
    const price = Number(this.resource.price)

    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'studentId',
        'package',
        'lessonsTotal',
        'status',
        'paidAt',
        'expiresAt',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      price,
      lessonsDone: done,
      lessonsRemaining: remainingCreditsFromCount(this.resource.lessonsTotal, done),
      lessonsSchedulable: remainingCreditsFromCount(this.resource.lessonsTotal, active),
      discounts: PlanDiscountTransformer.transform(discounts),
      discountTotal,
      netPrice: netPriceFromPlan(price, discounts),
    }
  }
}
