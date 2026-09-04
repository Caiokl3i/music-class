import type PlanDiscount from '#models/plan_discount'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PlanDiscountTransformer extends BaseTransformer<PlanDiscount> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'planId',
        'name',
        'serviceAt',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      amount: Number(this.resource.amount),
    }
  }
}
