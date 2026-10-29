/*
|--------------------------------------------------------------------------
| Database Migration Parity Verifier (V1 -> V2)
|--------------------------------------------------------------------------
|
| Compares row counts across all 7 V1 core tables, financial sums
| (SUM(price), SUM(lessons_total), SUM(amount)), and optional V2
| post-migration invariants (21 schema records, CHECK constraints, RLS).
|
| Usage:
|   SOURCE_DATABASE_URL="postgres://..." TARGET_DATABASE_URL="postgres://..." \
|     npm run db:verify:parity -- [--post-migrate] [--json]
|
*/

import {
  collectDatabaseSnapshot,
  compareMigrationParity,
  createPgClient,
} from '#services/migration_parity'

const sourceUrl = process.env.SOURCE_DATABASE_URL
const targetUrl = process.env.TARGET_DATABASE_URL || process.env.TARGET_DIRECT_URL
const postMigrate = process.argv.includes('--post-migrate')
const jsonOutput = process.argv.includes('--json')

if (!sourceUrl || !targetUrl) {
  console.error(
    '❌ Error: SOURCE_DATABASE_URL and TARGET_DATABASE_URL (or TARGET_DIRECT_URL) must be set.'
  )
  process.exit(1)
}

async function main() {
  const sourceClient = createPgClient(sourceUrl!)
  const targetClient = createPgClient(targetUrl!)

  await sourceClient.connect()
  await targetClient.connect()

  try {
    const [sourceSnap, targetSnap] = await Promise.all([
      collectDatabaseSnapshot(sourceClient),
      collectDatabaseSnapshot(targetClient),
    ])

    const report = compareMigrationParity(sourceSnap, targetSnap, { postMigrate })

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(
        `\n🔍 Relatório de Paridade de Migração (${postMigrate ? 'PÓS-MIGRATION V2' : 'PRÉ-MIGRATION / DUMP PURO'})`
      )
      console.log('------------------------------------------------------------------------')
      console.log('📊 Contagem de Registros (Tabelas V1):')
      for (const row of report.tableChecks) {
        const icon = row.match ? '✅' : '❌'
        console.log(
          `  ${icon} ${row.table.padEnd(20)} | Origem: ${String(row.sourceCount).padStart(6)} | Destino: ${String(row.targetCount).padStart(6)}`
        )
      }

      console.log('\n💰 Somas Financeiras e Métricas de Negócio:')
      for (const agg of report.aggregateChecks) {
        const icon = agg.match ? '✅' : '❌'
        console.log(
          `  ${icon} ${agg.metric.padEnd(26)} | Origem: ${agg.sourceValue.padStart(10)} | Destino: ${agg.targetValue.padStart(10)}`
        )
      }

      if (report.postMigrateChecks.length > 0) {
        console.log('\n🛡️  Invariantes Pós-Migração V2 (Schema, Constraints & RLS):')
        for (const item of report.postMigrateChecks) {
          const icon = item.match ? '✅' : '❌'
          console.log(`  ${icon} ${item.check}: ${item.actual}`)
        }
      }

      console.log('------------------------------------------------------------------------')
      if (report.passed) {
        console.log('🎉 PARIDADE 100% APROVADA!\n')
      } else {
        console.error('❌ DIVERGÊNCIAS DETECTADAS:')
        for (const f of report.failures) {
          console.error(`   - ${f}`)
        }
        console.error('')
      }
    }

    if (!report.passed) {
      process.exitCode = 1
    }
  } finally {
    await sourceClient.end().catch(() => {})
    await targetClient.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('❌ Erro fatal na verificação de paridade:', err)
  process.exit(1)
})
