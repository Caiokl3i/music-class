import { mkdir } from 'node:fs/promises'
import { createError } from '@adonisjs/core/exceptions'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { isPostgres } from '#database/connection'
import { backupDestination, pruneBackups } from '#services/backup_files'

export const BACKUP_SQLITE_ONLY = createError(
  'File backup is only available with SQLite',
  'E_BACKUP_SQLITE_ONLY',
  503
)

const DEFAULT_KEEP = 14

export function defaultBackupDirectory() {
  return env.get('BACKUP_DIR') || app.makePath('backups')
}

export async function backupSqlite(options?: { directory?: string; keep?: number }) {
  if (isPostgres()) {
    throw new BACKUP_SQLITE_ONLY()
  }

  const directory = options?.directory ?? defaultBackupDirectory()
  const keep = options?.keep ?? DEFAULT_KEEP

  await mkdir(directory, { recursive: true })

  const dest = backupDestination(directory)
  const escaped = dest.replaceAll("'", "''")

  await db.rawQuery(`VACUUM INTO '${escaped}'`)
  await pruneBackups(directory, keep)

  return { path: dest, directory }
}
