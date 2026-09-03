import { access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { backupDestination, pruneBackups } from '#services/backup_files'

const DEFAULT_KEEP = 14
const root = fileURLToPath(new URL('../', import.meta.url))
const source = join(root, 'tmp', 'db.sqlite3')
const directory = process.env.BACKUP_DIR || join(root, 'backups')
const keep = Number(process.argv[2] || DEFAULT_KEEP)

try {
  await access(source)
} catch {
  console.error(`Banco não encontrado em ${source}`)
  process.exit(1)
}

await mkdir(directory, { recursive: true })
const dest = backupDestination(directory)
const db = new Database(source, { fileMustExist: true, readonly: true })
db.exec(`VACUUM INTO '${dest.replaceAll("'", "''")}'`)
db.close()
await pruneBackups(directory, Number.isFinite(keep) && keep > 0 ? keep : DEFAULT_KEEP)

console.log(`Backup salvo em ${dest}`)
