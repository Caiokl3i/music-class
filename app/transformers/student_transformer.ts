import type Student from '#models/student'
import type Plan from '#models/plan'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { usableCreditsFromCount } from '#services/plan_credits'

export default class StudentTransformer extends BaseTransformer<Student> {
  toObject() {
    const paidPlans = (this.resource.$preloaded.plans as Plan[] | undefined) ?? []

    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'name',
        'birthdate',
        'instrument',
        'phone',
        'description',
        'createdAt',
        'updatedAt',
      ]),
      creditsRemaining: paidPlans.reduce((sum, plan) => {
        return sum + usableCreditsFromCount(plan, Number(plan.$extras.lessons_count ?? 0))
      }, 0),
      activePlansCount: paidPlans.filter((plan) => {
        return usableCreditsFromCount(plan, Number(plan.$extras.lessons_count ?? 0)) > 0
      }).length,
    }
  }
}
