import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Drops the enum CHECK on `plans.package` by replacing the column
 * with the copied string values from `package_slug`.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('plans', (table) => {
      table.dropColumn('package')
    })

    this.schema.alterTable('plans', (table) => {
      table.renameColumn('package_slug', 'package')
    })
  }

  async down() {
    this.schema.alterTable('plans', (table) => {
      table.renameColumn('package', 'package_slug')
    })

    this.schema.alterTable('plans', (table) => {
      table.enum('package', ['single', 'pack_4', 'pack_8']).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery('UPDATE plans SET package = package_slug')
    })
  }
}
