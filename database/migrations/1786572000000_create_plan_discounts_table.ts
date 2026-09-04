import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plan_discounts'

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
      table
        .integer('plan_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('plans')
        .onDelete('CASCADE')
      table.string('name', 120).notNullable()
      table.decimal('amount', 8, 2).notNullable()
      table.date('service_at').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'plan_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
