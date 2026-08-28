import type Plan from '#models/plan'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PlanTransformer extends BaseTransformer<Plan> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'studentId',
        'package',
        'lessonsTotal',
        'price',
        'status',
        'paidAt',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      lessonsRemaining: this.lessonsRemaining(),
    }
  }

  private lessonsRemaining() {
    const consumed = Number(this.resource.$extras.lessons_count ?? 0)
    return this.resource.lessonsTotal - consumed
  }
}
