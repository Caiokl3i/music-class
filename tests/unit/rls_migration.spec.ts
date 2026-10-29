/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import { RLS_PROTECTED_TABLES } from '#database/migrations/1786578000000_enable_rls_all_tables'

test.group('RLS Migration', () => {
  test('includes all core application tables', ({ assert }) => {
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
})
