import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('preferred_weekday').unsigned().nullable()
      table.string('preferred_time', 5).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preferred_weekday')
      table.dropColumn('preferred_time')
    })
  }
}
