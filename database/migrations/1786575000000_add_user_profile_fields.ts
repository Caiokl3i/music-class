import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('phone', 30).nullable()
      table.string('studio_name', 120).nullable()
      table.string('city', 120).nullable()
      table.string('instruments', 255).nullable()
      table.text('bio').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('phone')
      table.dropColumn('studio_name')
      table.dropColumn('city')
      table.dropColumn('instruments')
      table.dropColumn('bio')
    })
  }
}
