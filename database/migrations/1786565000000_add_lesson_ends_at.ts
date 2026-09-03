import { DateTime } from 'luxon'
import { BaseSchema } from '@adonisjs/lucid/schema'
import { LESSON_DURATION_MINUTES } from '#services/package_catalog'

function parseStoredDate(value: unknown) {
  const raw = String(value)
  const sql = DateTime.fromSQL(raw)
  if (sql.isValid) {
    return sql
  }
  const iso = DateTime.fromISO(raw)
  return iso.isValid ? iso : null
}

export default class extends BaseSchema {
  protected tableName = 'lessons'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('ends_at').nullable()
    })

    this.defer(async (db) => {
      const rows = await db.from(this.tableName).select('id', 'scheduled_at').whereNull('ends_at')
      for (const row of rows) {
        const start = parseStoredDate(row.scheduled_at)
        if (!start) {
          continue
        }
        await db
          .from(this.tableName)
          .where('id', row.id)
          .update({ ends_at: start.plus({ minutes: LESSON_DURATION_MINUTES }).toSQL({ includeOffset: false }) })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ends_at')
    })
  }
}
