import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lessons'

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
      table
        .integer('plan_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('plans')
        .onDelete('CASCADE')
      table.timestamp('scheduled_at').notNullable()
      table.enum('status', ['scheduled', 'done', 'cancelled', 'no_show']).notNullable()
      table.text('description').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
