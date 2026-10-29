/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import { resolveDbConnection, isPostgres } from '#database/connection'

test.group('Database connection resolver', () => {
  test('resolves sqlite by default in test environment', ({ assert }) => {
    assert.equal(resolveDbConnection(), 'sqlite')
    assert.isFalse(isPostgres())
  })
})
