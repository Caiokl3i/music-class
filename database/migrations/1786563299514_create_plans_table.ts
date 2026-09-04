import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plans'

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
        .integer('student_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('students')
        .onDelete('CASCADE')
      table.string('package', 64).notNullable()
      table.integer('lessons_total').notNullable()
      table.decimal('price', 8, 2).notNullable()
      table.enum('status', ['pending', 'paid', 'cancelled']).notNullable()
      table.timestamp('paid_at').nullable()
      table.text('notes').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
