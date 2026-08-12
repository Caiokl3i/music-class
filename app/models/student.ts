import { StudentSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Plan from '#models/plan'
import Lesson from '#models/lesson'

export default class Student extends StudentSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Plan)
  declare plans: HasMany<typeof Plan>

  @hasMany(() => Lesson)
  declare lessons: HasMany<typeof Lesson>
}
