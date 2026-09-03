import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'

const BACKUP_PREFIX = 'db-'
const BACKUP_SUFFIX = '.sqlite3'

export function backupDestination(directory: string, at = DateTime.now()) {
  const stamp = at.toFormat('yyyyMMdd-HHmmss')
  return join(directory, `${BACKUP_PREFIX}${stamp}-${randomBytes(3).toString('hex')}${BACKUP_SUFFIX}`)
}

export function isBackupFile(name: string) {
  return name.startsWith(BACKUP_PREFIX) && name.endsWith(BACKUP_SUFFIX)
}

export async function pruneBackups(directory: string, keep: number) {
  if (keep < 1) {
    return
  }

  const names = await readdir(directory)
  const ranked = await Promise.all(
    names.filter(isBackupFile).map(async (name) => {
      const path = join(directory, name)
      const info = await stat(path)
      return { path, mtime: info.mtimeMs }
    })
  )

  ranked.sort((left, right) => right.mtime - left.mtime)

  for (const file of ranked.slice(keep)) {
    await unlink(file.path)
  }
}
