import app from '@adonisjs/core/services/app'
import env from '#start/env'

export type DbConnectionName = 'sqlite' | 'pg'

export function resolveDbConnection(): DbConnectionName {
  if (app.inTest) {
    const testDb = env.get('TEST_DB') || env.get('DB_CONNECTION')
    if (testDb === 'pg' || testDb === 'sqlite') {
      return testDb
    }
    return 'sqlite'
  }

  const isBuilding = process.argv.includes('build')
  const isProduction = app.inProduction || env.get('NODE_ENV') === 'production'

  const named = env.get('DB_CONNECTION')
  if (named === 'pg' || named === 'sqlite') {
    if (isProduction && !isBuilding && named === 'sqlite') {
      throw new Error(
        'SQLite connection is not allowed in production. Configure DATABASE_URL or DB_CONNECTION=pg to prevent silent data loss on ephemeral disk.'
      )
    }
    return named
  }

  const databaseUrl = env.get('DATABASE_URL')
  if (databaseUrl) {
    return 'pg'
  }

  if (isProduction && !isBuilding) {
    throw new Error(
      'DATABASE_URL is required in production environment. SQLite fallback is disabled in production to prevent silent data loss.'
    )
  }

  return 'sqlite'
}

export function isPostgres() {
  return resolveDbConnection() === 'pg'
}
