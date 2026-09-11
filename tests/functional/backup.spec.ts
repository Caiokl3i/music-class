import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  emailSqliteBackup,
  setBackupEmailTestHooks,
} from '#services/backup_email'
import { RATE_LIMITS, resetRateLimits, setRateLimitEnabled } from '#services/rate_limit'
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

test.group('Backup email', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => setBackupEmailTestHooks(null))

  test('rejects guests', async ({ client }) => {
    const response = await client.post('/api/v1/account/backup-email')
    response.assertStatus(401)
  })

  test('returns 503 when Resend is not configured', async ({ client }) => {
    setBackupEmailTestHooks({})
    const teacher = await createTeacher()
    const response = await client.post('/api/v1/account/backup-email').loginAs(teacher)
    response.assertStatus(503)
    response.assertBodyContains({ code: 'E_BACKUP_EMAIL_NOT_CONFIGURED' })
  })

  test('emails a sqlite copy', async ({ assert, client }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-email-'))
    const sent: Array<{ to: string; filename: string; size: number }> = []

    setBackupEmailTestHooks({
      apiKey: 're_test',
      to: 'backup@example.com',
      directory,
      send: async (payload) => {
        const attachment = payload.attachments[0]
        sent.push({
          to: payload.to,
          filename: attachment.filename,
          size: attachment.content.byteLength,
        })
        return { error: null }
      },
    })

    try {
      const teacher = await createTeacher()
      const response = await client.post('/api/v1/account/backup-email').loginAs(teacher)
      response.assertStatus(200)
      response.assertBodyContains({
        message: 'Backup sent',
        to: 'backup@example.com',
      })
      assert.lengthOf(sent, 1)
      assert.equal(sent[0].to, 'backup@example.com')
      assert.isTrue(sent[0].filename.endsWith('.sqlite3'))
      assert.isAbove(sent[0].size, 0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('returns 502 when the mail provider fails', async ({ client }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-fail-'))
    setBackupEmailTestHooks({
      apiKey: 're_test',
      to: 'backup@example.com',
      directory,
      send: async () => ({ error: { message: 'rate limited' } }),
    })

    try {
      const teacher = await createTeacher()
      const response = await client.post('/api/v1/account/backup-email').loginAs(teacher)
      response.assertStatus(502)
      response.assertBodyContains({ code: 'E_BACKUP_EMAIL_FAILED' })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('throttles repeated backup emails', async ({ client }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-limit-'))
    setRateLimitEnabled(true)
    resetRateLimits()
    setBackupEmailTestHooks({
      apiKey: 're_test',
      to: 'backup@example.com',
      directory,
      send: async () => ({ error: null }),
    })

    try {
      const teacher = await createTeacher()
      for (let i = 0; i < RATE_LIMITS.backupEmail.max; i++) {
        const attempt = await client.post('/api/v1/account/backup-email').loginAs(teacher)
        attempt.assertStatus(200)
      }

      const blocked = await client.post('/api/v1/account/backup-email').loginAs(teacher)
      blocked.assertStatus(429)
      blocked.assertBodyContains({ code: 'E_TOO_MANY_REQUESTS' })
    } finally {
      setRateLimitEnabled(false)
      resetRateLimits()
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('emailSqliteBackup writes the file before sending', async ({ assert }) => {
    const directory = await mkdtemp(join(tmpdir(), 'music-class-backup-service-'))
    setBackupEmailTestHooks({
      apiKey: 're_test',
      to: 'backup@example.com',
      send: async () => ({ error: null }),
    })

    try {
      await createTeacher()
      const result = await emailSqliteBackup({ directory, keep: 2 })
      const info = await stat(join(directory, result.filename))
      assert.equal(result.to, 'backup@example.com')
      assert.isAbove(info.size, 0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
