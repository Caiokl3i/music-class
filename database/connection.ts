import app from '@adonisjs/core/services/app'
import env from '#start/env'

export type DbConnectionName = 'sqlite' | 'pg'

export function resolveDbConnection(): DbConnectionName {
  if (app.inTest) {
    return 'sqlite'
  }

  const named = env.get('DB_CONNECTION')
  if (named === 'pg' || named === 'sqlite') {
    return named
  }

  return env.get('DATABASE_URL') ? 'pg' : 'sqlite'
}

export function isPostgres() {
  return resolveDbConnection() === 'pg'
}
