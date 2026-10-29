import { BaseSchema } from '@adonisjs/lucid/schema'
import { isPostgres } from '#database/connection'

export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    this.defer(async (db) => {
      if (isPostgres()) {
        await db.rawQuery(
          `ALTER TABLE ${this.tableName} ADD CONSTRAINT check_plans_lessons_total_positive CHECK (lessons_total > 0)`
        )
        await db.rawQuery(
          `ALTER TABLE ${this.tableName} ADD CONSTRAINT check_plans_price_non_negative CHECK (price >= 0)`
        )
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      if (isPostgres()) {
        await db.rawQuery(
          `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS check_plans_lessons_total_positive`
        )
        await db.rawQuery(
          `ALTER TABLE ${this.tableName} DROP CONSTRAINT IF EXISTS check_plans_price_non_negative`
        )
      }
    })
  }
}
