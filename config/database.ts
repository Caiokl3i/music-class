import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import { resolveDbConnection } from '#database/connection'

function postgresConnection() {
  const isMigration = process.argv.some((arg) => arg.includes('migration'))
  const url = (isMigration && env.get('DATABASE_DIRECT_URL')) || env.get('DATABASE_URL')
  if (url) {
    const local = /localhost|127\.0\.0\.1/.test(url)
    return {
      connectionString: url,
      ssl: local ? false : { rejectUnauthorized: false },
    }
  }

  return {
    host: env.get('DB_HOST') || '127.0.0.1',
    port: env.get('DB_PORT') || 5432,
    user: env.get('DB_USER') || 'postgres',
    password: env.get('DB_PASSWORD') || '',
    database: env.get('DB_DATABASE') || 'musicclass',
  }
}

const dbConfig = defineConfig({
  connection: resolveDbConnection(),

  connections: {
    sqlite: {
      client: 'better-sqlite3',

      connection: {
        filename: app.inTest ? ':memory:' : app.tmpPath('db.sqlite3'),
      },

      useNullAsDefault: true,

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
    },

    pg: {
      client: 'pg',
      connection: postgresConnection(),
      pool: {
        min: 0,
        max: env.get('DB_POOL_MAX') || 2,
        idleTimeoutMillis: 30000,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
