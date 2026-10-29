/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import env from '#start/env'
import { resolveDbConnection, isPostgres } from '#database/connection'

test.group('Database connection resolver', () => {
  test('resolves expected driver in test environment according to TEST_DB', ({ assert }) => {
    const expected = env.get('TEST_DB') === 'pg' ? 'pg' : 'sqlite'
    assert.equal(resolveDbConnection(), expected)
    assert.equal(isPostgres(), expected === 'pg')
  })
})
