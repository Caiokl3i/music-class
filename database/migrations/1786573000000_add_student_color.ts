import { BaseSchema } from '@adonisjs/lucid/schema'

const COLOR_TONES = ['accent', 'success', 'warning', 'danger'] as const

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('color', 32).notNullable().defaultTo('accent')
    })

    this.defer(async (db) => {
      const rows = await db.from(this.tableName).select('id')
      for (const row of rows) {
        const color = COLOR_TONES[Math.abs(Number(row.id)) % COLOR_TONES.length]
        await db.from(this.tableName).where('id', row.id).update({ color })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('color')
    })
  }
}
