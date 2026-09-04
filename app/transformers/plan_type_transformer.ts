import type PlanType from '#models/plan_type'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PlanTypeTransformer extends BaseTransformer<PlanType> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'slug',
        'label',
        'lessons',
        'sortOrder',
        'createdAt',
        'updatedAt',
      ]),
      price: Number(this.resource.price),
    }
  }
}
