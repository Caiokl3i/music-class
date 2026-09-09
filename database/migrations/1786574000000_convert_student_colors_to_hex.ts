import { BaseSchema } from '@adonisjs/lucid/schema'

const LEGACY: Record<string, string> = {
  accent: '#0f766e',
  success: '#047857',
  warning: '#b45309',
  danger: '#dc2626',
}

export default class extends BaseSchema {
  protected tableName = 'students'

  async up() {
    this.defer(async (db) => {
      const rows = await db.from(this.tableName).select('id', 'color')
      for (const row of rows) {
        const current = String(row.color ?? '')
        const next = LEGACY[current] ?? (/^#[0-9A-Fa-f]{6}$/.test(current) ? current : '#0f766e')
        if (next !== current) {
          await db.from(this.tableName).where('id', row.id).update({ color: next })
        }
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.string('color', 32).notNullable().defaultTo('#0f766e').alter()
    })
  }

  async down() {
    // Irreversível de forma fiel: hex livre não mapeia 1:1 para tokens.
  }
}
