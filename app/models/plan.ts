import { PlanSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Student from '#models/student'
import Lesson from '#models/lesson'

export default class Plan extends PlanSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @hasMany(() => Lesson)
  declare lessons: HasMany<typeof Lesson>

  /**
   * Credits still available on this plan.
   * Active lessons are those whose status is not `cancelled`.
   */
  async remainingCredits(exceptLessonId?: number) {
    const query = this.related('lessons').query().whereNot('status', 'cancelled')

    if (exceptLessonId !== undefined) {
      query.whereNot('id', exceptLessonId)
    }

    const result = await query.count('* as total')
    const consumed = Number(result[0]?.$extras.total ?? 0)

    return this.lessonsTotal - consumed
  }
}
