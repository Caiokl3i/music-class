import type Student from '#models/student'
import type Plan from '#models/plan'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { usableCreditsFromCount, lessonsDoneFromExtras } from '#services/plan_credits'

export default class StudentTransformer extends BaseTransformer<Student> {
  toObject() {
    const openPlans = (this.resource.$preloaded.plans as Plan[] | undefined) ?? []

    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'name',
        'birthdate',
        'instrument',
        'phone',
        'description',
        'level',
        'tags',
        'preferredWeekday',
        'preferredTime',
        'createdAt',
        'updatedAt',
      ]),
      creditsRemaining: openPlans.reduce((sum, plan) => {
        return sum + usableCreditsFromCount(plan, lessonsDoneFromExtras(plan))
      }, 0),
      activePlansCount: openPlans.filter((plan) => {
        return usableCreditsFromCount(plan, lessonsDoneFromExtras(plan)) > 0
      }).length,
    }
  }
}
