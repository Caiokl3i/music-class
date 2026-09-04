import { PlanDiscountSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Plan from '#models/plan'

export default class PlanDiscount extends PlanDiscountSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>
}
