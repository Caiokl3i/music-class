import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { backupSqlite } from '#services/sqlite_backup'
import { createTeacher } from '#tests/helpers'

test.group('SQLite backup', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('copies the database to a folder outside tmp', async ({ assert }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-'))
    try {
      await createTeacher()
      const result = await backupSqlite({ directory, keep: 14 })
      const info = await stat(result.path)

      assert.equal(result.directory, directory)
      assert.isTrue(result.path.startsWith(directory))
      assert.isAbove(info.size, 0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('keeps only the newest backups', async ({ assert }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-'))
    try {
      await createTeacher()
      await backupSqlite({ directory, keep: 2 })
      await backupSqlite({ directory, keep: 2 })
      await backupSqlite({ directory, keep: 2 })

      const files = (await readdir(directory)).filter((name) => name.endsWith('.sqlite3'))
      assert.lengthOf(files, 2)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
