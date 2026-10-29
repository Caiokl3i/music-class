/// <reference types="@japa/assert" />
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@japa/runner'

export const HISTORICAL_MIGRATIONS = [
  '1761885935168_create_users_table.ts',
  '1768620764696_create_access_tokens_table.ts',
  '1786562179541_create_students_table.ts',
  '1786563299514_create_plans_table.ts',
  '1786563366925_create_lessons_table.ts',
  '1786563500000_add_lookup_indexes.ts',
  '1786563600000_add_plan_expires_at.ts',
  '1786564000000_add_student_preferred_schedule.ts',
  '1786565000000_add_lesson_ends_at.ts',
  '1786570400000_add_student_level_tags.ts',
  '1786571000000_create_plan_types_table.ts',
  '1786571100000_add_plans_package_slug.ts',
  '1786571200000_replace_plans_package_column.ts',
  '1786572000000_create_plan_discounts_table.ts',
  '1786573000000_add_student_color.ts',
  '1786574000000_convert_student_colors_to_hex.ts',
  '1786575000000_add_user_profile_fields.ts',
  '1786576000000_add_student_archived_at.ts',
  '1786577000000_add_plan_financial_checks.ts',
  '1786577500000_create_rate_limit_buckets_table.ts',
  '1786578000000_enable_rls_all_tables.ts',
] as const

const CONTRACT_OVERRIDE_DIRECTIVE = '@allow-contract-migration'

const DESTRUCTIVE_UP_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\.\s*dropTable(?:IfExists)?\s*\(/,
    description: 'schema.dropTable / dropTableIfExists',
  },
  { pattern: /\.\s*dropColumns?\s*\(/, description: 'table.dropColumn / dropColumns' },
  { pattern: /\bDROP\s+TABLE\b/i, description: 'raw SQL DROP TABLE' },
  { pattern: /\bDROP\s+COLUMN\b/i, description: 'raw SQL DROP COLUMN' },
]

export function validateExpandOnlyMigrationSource(source: string): {
  valid: boolean
  reason?: string
} {
  if (source.includes(CONTRACT_OVERRIDE_DIRECTIVE)) {
    return { valid: true }
  }

  const upStart = source.search(/\basync\s+up\s*\(/)
  if (upStart === -1) {
    return { valid: true }
  }

  const downStart = source.slice(upStart).search(/\basync\s+down\s*\(/)
  const upSection =
    downStart === -1 ? source.slice(upStart) : source.slice(upStart, upStart + downStart)

  for (const rule of DESTRUCTIVE_UP_PATTERNS) {
    if (rule.pattern.test(upSection)) {
      return {
        valid: false,
        reason: `Destructive operation (${rule.description}) detected inside up(). Follow expand -> migrate -> contract across separate releases, or add '// ${CONTRACT_OVERRIDE_DIRECTIVE}' only in a dedicated contract release.`,
      }
    }
  }

  return { valid: true }
}

const migrationsDir = fileURLToPath(new URL('../../database/migrations', import.meta.url))

test.group('Phase 8 migration guardrails', () => {
  test('preserves all 21 historical migrations intact without deletion or rename', async ({
    assert,
  }) => {
    const entries = await readdir(migrationsDir)
    const files = entries.filter((name) => name.endsWith('.ts')).sort()

    for (const historical of HISTORICAL_MIGRATIONS) {
      assert.isTrue(
        files.includes(historical),
        `Historical migration '${historical}' must never be deleted or renamed`
      )
    }
  })

  test('enforces expand-only rule on all new Phase 8+ migrations', async ({ assert }) => {
    const historicalSet = new Set<string>(HISTORICAL_MIGRATIONS)
    const entries = await readdir(migrationsDir)
    const files = entries.filter((name) => name.endsWith('.ts') && !historicalSet.has(name)).sort()

    for (const file of files) {
      const content = await readFile(join(migrationsDir, file), 'utf8')
      const result = validateExpandOnlyMigrationSource(content)
      assert.isTrue(result.valid, `Migration '${file}' failed guardrail: ${result.reason}`)
    }
  })

  test('validator blocks destructive up() while allowing down() rollbacks and explicit contract override', ({
    assert,
  }) => {
    const expandSample = `
      export default class extends BaseSchema {
        async up() {
          this.schema.alterTable('students', (table) => {
            table.string('instagram_handle').nullable()
          })
        }
        async down() {
          this.schema.alterTable('students', (table) => {
            table.dropColumn('instagram_handle')
          })
        }
      }
    `
    assert.isTrue(validateExpandOnlyMigrationSource(expandSample).valid)

    const prematureContractSample = `
      export default class extends BaseSchema {
        async up() {
          this.schema.alterTable('students', (table) => {
            table.dropColumn('legacy_field')
          })
        }
        async down() {}
      }
    `
    assert.isFalse(validateExpandOnlyMigrationSource(prematureContractSample).valid)

    const deliberateContractSample = `
      // @allow-contract-migration
      export default class extends BaseSchema {
        async up() {
          this.schema.alterTable('students', (table) => {
            table.dropColumn('legacy_field')
          })
        }
        async down() {}
      }
    `
    assert.isTrue(validateExpandOnlyMigrationSource(deliberateContractSample).valid)
  })
})
