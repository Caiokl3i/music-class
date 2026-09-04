import { PlanSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Student from '#models/student'
import Lesson from '#models/lesson'
import PlanDiscount from '#models/plan_discount'
import { remainingCredits as calculateRemainingCredits } from '#services/plan_credits'

export default class Plan extends PlanSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @hasMany(() => Lesson)
  declare lessons: HasMany<typeof Lesson>

  @hasMany(() => PlanDiscount)
  declare discounts: HasMany<typeof PlanDiscount>

  remainingCredits(exceptLessonId?: number) {
    return calculateRemainingCredits(this, exceptLessonId)
  }
}
