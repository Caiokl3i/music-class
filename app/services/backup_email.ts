import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { Resend } from 'resend'
import { createError } from '@adonisjs/core/exceptions'
import env from '#start/env'
import { backupSqlite } from '#services/sqlite_backup'

export const BACKUP_EMAIL_NOT_CONFIGURED = createError(
  'Backup email is not configured',
  'E_BACKUP_EMAIL_NOT_CONFIGURED',
  503
)

export const BACKUP_EMAIL_FAILED = createError(
  'Could not send the backup email',
  'E_BACKUP_EMAIL_FAILED',
  502
)

export type BackupEmailPayload = {
  from: string
  to: string
  subject: string
  text: string
  attachments: Array<{ filename: string; content: Buffer }>
}

export type BackupEmailTransport = (
  payload: BackupEmailPayload
) => Promise<{ error: { message: string } | null }>

type BackupEmailTestHooks = {
  apiKey?: string
  to?: string
  from?: string
  directory?: string
  send?: BackupEmailTransport
}

let testHooks: BackupEmailTestHooks | null = null

export function setBackupEmailTestHooks(hooks: BackupEmailTestHooks | null) {
  testHooks = hooks
}

async function sendWithResend(apiKey: string, payload: BackupEmailPayload) {
  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send(payload)
    return { error: error ? { message: error.message } : null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'send failed'
    return { error: { message } }
  }
}

function configuredValue(fromHooks: string | undefined, fromEnv: string | undefined) {
  return testHooks ? fromHooks : fromEnv
}

export async function emailSqliteBackup(options?: { directory?: string; keep?: number }) {
  const apiKey = configuredValue(testHooks?.apiKey, env.get('RESEND_API_KEY'))
  const to = configuredValue(testHooks?.to, env.get('BACKUP_EMAIL_TO'))
  const from =
    configuredValue(testHooks?.from, env.get('RESEND_FROM')) ||
    'Music Class <onboarding@resend.dev>'

  if (!apiKey || !to) {
    throw new BACKUP_EMAIL_NOT_CONFIGURED()
  }

  const { path } = await backupSqlite({
    directory: options?.directory ?? testHooks?.directory,
    keep: options?.keep ?? 12,
  })
  const content = await readFile(path)
  const filename = basename(path)
  const send = testHooks?.send ?? ((payload) => sendWithResend(apiKey, payload))

  try {
    const { error } = await send({
      from,
      to,
      subject: `Backup music-class ${filename}`,
      text: 'Segue a cópia do banco em anexo. Guarde este e-mail.',
      attachments: [{ filename, content }],
    })

    if (error) {
      throw new BACKUP_EMAIL_FAILED()
    }
  } catch (error) {
    if (error instanceof BACKUP_EMAIL_FAILED) {
      throw error
    }
    throw new BACKUP_EMAIL_FAILED()
  }

  return { to, filename }
}
