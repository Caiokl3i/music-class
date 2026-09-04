import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Copies `package` into an unconstrained string column.
 * The CHECK from the old enum is dropped in the next migration.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('plans', (table) => {
      table.string('package_slug', 64).nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery('UPDATE plans SET package_slug = package')
    })
  }

  async down() {
    this.schema.alterTable('plans', (table) => {
      table.dropColumn('package_slug')
    })
  }
}
