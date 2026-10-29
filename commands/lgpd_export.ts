import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { writeFile } from 'node:fs/promises'

export default class LgpdExport extends BaseCommand {
  static commandName = 'lgpd:student'
  static description = 'Export or anonymize student personal data for LGPD compliance'
  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'ID of the student' })
  declare studentId: string

  @flags.boolean({ description: 'Anonymize student data instead of exporting' })
  declare anonymize: boolean

  @flags.string({ description: 'Output file path (defaults to stdout)' })
  declare output: string

  async run() {
    const id = Number(this.studentId)
    if (!Number.isFinite(id) || id <= 0) {
      this.logger.error('Invalid student ID provided.')
      this.exitCode = 1
      return
    }

    const { buildStudentDossier, anonymizeStudent } = await import('#services/lgpd_service')

    if (this.anonymize) {
      const ok = await anonymizeStudent(id)
      if (ok) {
        this.logger.success(`Student #${id} personal data has been anonymized successfully.`)
      } else {
        this.logger.error(`Student #${id} not found.`)
        this.exitCode = 1
      }
      return
    }

    const dossier = await buildStudentDossier(id)
    if (!dossier) {
      this.logger.error(`Student #${id} not found.`)
      this.exitCode = 1
      return
    }

    const json = JSON.stringify(dossier, null, 2)
    if (this.output) {
      await writeFile(this.output, json, 'utf-8')
      this.logger.success(`LGPD Dossier exported to ${this.output}`)
    } else {
      console.log(json)
    }
  }
}
