/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import env from '#start/env'
import { resolveDbConnection, isPostgres, resolvePostgresSsl } from '#database/connection'

test.group('Database connection resolver', () => {
  test('resolves expected driver in test environment according to TEST_DB', ({ assert }) => {
    const expected = env.get('TEST_DB') === 'pg' ? 'pg' : 'sqlite'
    assert.equal(resolveDbConnection(), expected)
    assert.equal(isPostgres(), expected === 'pg')
  })

  test('disables PostgreSQL SSL automatically for localhost, 127.0.0.1 and docker postgres service', ({
    assert,
  }) => {
    assert.isFalse(resolvePostgresSsl('postgres://postgres:pass@localhost:5432/musicclass'))
    assert.isFalse(resolvePostgresSsl('postgres://postgres:pass@127.0.0.1:5432/musicclass'))
    assert.isFalse(resolvePostgresSsl('postgres://postgres:pass@postgres:5432/musicclass'))
  })

  test('enables PostgreSQL SSL automatically for remote cloud hosts and respects DB_SSL override', ({
    assert,
  }) => {
    assert.deepEqual(
      resolvePostgresSsl(
        'postgres://postgres.ref:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
      ),
      { rejectUnauthorized: false }
    )
    assert.isFalse(
      resolvePostgresSsl(
        'postgres://postgres.ref:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
        'false'
      )
    )
    assert.deepEqual(
      resolvePostgresSsl('postgres://postgres:pass@localhost:5432/musicclass', 'true'),
      { rejectUnauthorized: false }
    )
  })
})
