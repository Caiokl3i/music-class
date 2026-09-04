import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_PLAN_TYPES } from '#services/package_catalog'

export default class extends BaseSchema {
  protected tableName = 'plan_types'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('slug', 64).notNullable()
      table.string('label', 80).notNullable()
      table.integer('lessons').notNullable()
      table.decimal('price', 8, 2).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'slug'])
      table.index(['user_id'], 'plan_types_user_id_index')
    })

    this.defer(async (db) => {
      const users = await db.from('users').select('id')
      const now = new Date()

      for (const user of users) {
        await db.table(this.tableName).insert(
          DEFAULT_PLAN_TYPES.map((item, index) => ({
            user_id: user.id,
            slug: item.slug,
            label: item.label,
            lessons: item.lessons,
            price: item.price,
            sort_order: index,
            created_at: now,
            updated_at: now,
          }))
        )
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
