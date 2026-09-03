import { mkdir } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { backupDestination, pruneBackups } from '#services/backup_files'

const DEFAULT_KEEP = 14

export function defaultBackupDirectory() {
  return env.get('BACKUP_DIR') || app.makePath('backups')
}

export async function backupSqlite(options?: { directory?: string; keep?: number }) {
  const directory = options?.directory ?? defaultBackupDirectory()
  const keep = options?.keep ?? DEFAULT_KEEP

  await mkdir(directory, { recursive: true })

  const dest = backupDestination(directory)
  const escaped = dest.replaceAll("'", "''")

  await db.rawQuery(`VACUUM INTO '${escaped}'`)
  await pruneBackups(directory, keep)

  return { path: dest, directory }
}
