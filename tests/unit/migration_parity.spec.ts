import { test } from '@japa/runner'
import {
  compareMigrationParity,
  V2_EXPECTED_PLAN_CONSTRAINTS,
  V2_EXPECTED_RLS_TABLES,
  type DatabaseSnapshot,
} from '#services/migration_parity'

function makeBaseSnapshot(): DatabaseSnapshot {
  return {
    counts: {
      users: 1,
      students: 2,
      plans: 5,
      lessons: 22,
      plan_types: 3,
      plan_discounts: 2,
      auth_access_tokens: 23,
    },
    aggregates: {
      plansPriceSum: '650.00',
      plansLessonsTotalSum: '20',
      planDiscountsAmountSum: '30.00',
      planTypesPriceSum: '450.00',
    },
    metadata: {
      migrationsCount: 18,
      hasRateLimitBucketsTable: false,
      planConstraints: [],
      rlsEnabledTables: [],
    },
  }
}

test.group('Migration parity comparison', () => {
  test('passes pre-migration parity when all 7 counts and financial sums match', ({ assert }) => {
    const source = makeBaseSnapshot()
    const target = makeBaseSnapshot()

    const report = compareMigrationParity(source, target, { postMigrate: false })
    assert.isTrue(report.passed)
    assert.lengthOf(report.failures, 0)
    assert.lengthOf(report.postMigrateChecks, 0)
  })

  test('detects row count or SUM(price) discrepancy immediately', ({ assert }) => {
    const source = makeBaseSnapshot()
    const target = makeBaseSnapshot()
    target.counts.lessons = 21
    target.aggregates.plansPriceSum = '600.00'

    const report = compareMigrationParity(source, target, { postMigrate: false })
    assert.isFalse(report.passed)
    assert.lengthOf(report.failures, 2)
    assert.include(report.failures[0], "Table 'lessons' count mismatch")
    assert.include(report.failures[1], "Aggregate 'plans.SUM(price)' mismatch")
  })

  test('validates post-migration invariants (21 migrations, rate_limit_buckets, CHECK constraints, RLS)', ({
    assert,
  }) => {
    const source = makeBaseSnapshot()
    const target = makeBaseSnapshot()
    target.metadata = {
      migrationsCount: 21,
      hasRateLimitBucketsTable: true,
      planConstraints: [...V2_EXPECTED_PLAN_CONSTRAINTS],
      rlsEnabledTables: [...V2_EXPECTED_RLS_TABLES],
    }

    const passingReport = compareMigrationParity(source, target, { postMigrate: true })
    assert.isTrue(passingReport.passed)

    target.metadata.rlsEnabledTables = target.metadata.rlsEnabledTables.filter(
      (t) => t !== 'students'
    )
    const failingReport = compareMigrationParity(source, target, { postMigrate: true })
    assert.isFalse(failingReport.passed)
    assert.isTrue(failingReport.failures.some((f) => f.includes('students')))
  })
})
