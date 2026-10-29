import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rate_limit_buckets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).primary()
      table.integer('count').notNullable().defaultTo(1)
      table.bigInteger('reset_at').notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
