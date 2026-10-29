/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { isPostgres } from '#database/connection'
import { RLS_PROTECTED_TABLES } from '#database/migrations/1786578000000_enable_rls_all_tables'

test.group('RLS Migration & Dynamic Guardrail', () => {
  test('includes all core application tables in baseline RLS migration', ({ assert }) => {
    const expectedTables = [
      'users',
      'auth_access_tokens',
      'students',
      'plans',
      'lessons',
      'plan_types',
      'plan_discounts',
      'rate_limit_buckets',
    ]

    for (const table of expectedTables) {
      assert.isTrue(
        (RLS_PROTECTED_TABLES as readonly string[]).includes(table),
        `Table ${table} should be protected with RLS`
      )
    }
  })

  test('verifies every public table in PostgreSQL has Row Level Security enabled', async ({
    assert,
  }) => {
    if (!isPostgres()) {
      return
    }

    const result = await db.rawQuery<{
      rows: Array<{ tablename: string; rowsecurity: boolean }>
    }>(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('adonis_schema', 'adonis_schema_versions')
      ORDER BY tablename ASC
    `)

    assert.isAbove(result.rows.length, 0, 'Expected public application tables in PostgreSQL')

    const unprotected = result.rows.filter((row) => !row.rowsecurity).map((row) => row.tablename)
    assert.deepEqual(
      unprotected,
      [],
      `Every public table in PostgreSQL must enable RLS (ALTER TABLE <name> ENABLE ROW LEVEL SECURITY). Missing RLS on: ${unprotected.join(', ')}`
    )
  })
})
