import { LessonSchema } from '#database/schema'
import { beforeSave, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { LESSON_DURATION_MINUTES } from '#services/package_catalog'
import User from '#models/user'
import Student from '#models/student'
import Plan from '#models/plan'

export default class Lesson extends LessonSchema {
  @beforeSave()
  static fillDefaultEnd(lesson: Lesson) {
    if (lesson.scheduledAt && !lesson.endsAt) {
      lesson.endsAt = lesson.scheduledAt.plus({ minutes: LESSON_DURATION_MINUTES })
    }
  }

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Student)
  declare student: BelongsTo<typeof Student>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
