import { BaseSchema } from '@adonisjs/lucid/schema'
import { isPostgres } from '#database/connection'

export const RLS_PROTECTED_TABLES = [
  'users',
  'auth_access_tokens',
  'students',
  'plans',
  'lessons',
  'plan_types',
  'plan_discounts',
  'rate_limit_buckets',
] as const

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      if (isPostgres()) {
        for (const table of RLS_PROTECTED_TABLES) {
          await db.rawQuery(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`)
        }
      }
    })
  }

  async down() {
    this.defer(async (db) => {
      if (isPostgres()) {
        for (const table of RLS_PROTECTED_TABLES) {
          await db.rawQuery(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`)
        }
      }
    })
  }
}
