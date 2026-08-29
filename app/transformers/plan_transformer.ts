import type Plan from '#models/plan'
import { BaseTransformer } from '@adonisjs/core/transformers'
import {
  remainingCreditsFromCount,
  lessonsDoneFromExtras,
  activeLessonsFromExtras,
} from '#services/plan_credits'

export default class PlanTransformer extends BaseTransformer<Plan> {
  toObject() {
    const done = lessonsDoneFromExtras(this.resource)
    const active = activeLessonsFromExtras(this.resource)

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
        'expiresAt',
        'notes',
        'createdAt',
        'updatedAt',
      ]),
      lessonsDone: done,
      lessonsRemaining: remainingCreditsFromCount(this.resource.lessonsTotal, done),
      lessonsSchedulable: remainingCreditsFromCount(this.resource.lessonsTotal, active),
    }
  }
}
