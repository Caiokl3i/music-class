import pg, { type Client as PgClient } from 'pg'

export const V1_CORE_TABLES = [
  'users',
  'students',
  'plans',
  'lessons',
  'plan_types',
  'plan_discounts',
  'auth_access_tokens',
] as const

export const V2_EXPECTED_RLS_TABLES = [
  'users',
  'auth_access_tokens',
  'students',
  'plans',
  'lessons',
  'plan_types',
  'plan_discounts',
  'rate_limit_buckets',
] as const

export const V2_EXPECTED_PLAN_CONSTRAINTS = [
  'check_plans_lessons_total_positive',
  'check_plans_price_non_negative',
] as const

export type V1CoreTable = (typeof V1_CORE_TABLES)[number]

export type DatabaseSnapshot = {
  counts: Record<V1CoreTable, number>
  aggregates: {
    plansPriceSum: string
    plansLessonsTotalSum: string
    planDiscountsAmountSum: string
    planTypesPriceSum: string
  }
  metadata: {
    migrationsCount: number
    hasRateLimitBucketsTable: boolean
    planConstraints: string[]
    rlsEnabledTables: string[]
  }
}

export type TableParityCheck = {
  table: V1CoreTable
  sourceCount: number
  targetCount: number
  match: boolean
}

export type AggregateParityCheck = {
  metric: string
  sourceValue: string
  targetValue: string
  match: boolean
}

export type PostMigrateCheck = {
  check: string
  expected: string
  actual: string
  match: boolean
}

export type ParityComparisonOptions = {
  postMigrate?: boolean
  expectedMigrationsCount?: number
}

export type ParityReport = {
  passed: boolean
  checkedAt: string
  tableChecks: TableParityCheck[]
  aggregateChecks: AggregateParityCheck[]
  postMigrateChecks: PostMigrateCheck[]
  failures: string[]
}

export function createPgClient(connectionString: string): PgClient {
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString)
  return new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  })
}

export async function collectDatabaseSnapshot(client: PgClient): Promise<DatabaseSnapshot> {
  const counts = {} as Record<V1CoreTable, number>

  for (const table of V1_CORE_TABLES) {
    const res = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.${table}`
    )
    counts[table] = res.rows[0]?.count ?? 0
  }

  const plansAgg = await client.query<{ price_sum: string; lessons_sum: string }>(
    `SELECT COALESCE(SUM(price), 0)::numeric(14,2)::text AS price_sum,
            COALESCE(SUM(lessons_total), 0)::bigint::text AS lessons_sum
       FROM public.plans`
  )

  const discountsAgg = await client.query<{ amount_sum: string }>(
    `SELECT COALESCE(SUM(amount), 0)::numeric(14,2)::text AS amount_sum
       FROM public.plan_discounts`
  )

  const planTypesAgg = await client.query<{ price_sum: string }>(
    `SELECT COALESCE(SUM(price), 0)::numeric(14,2)::text AS price_sum
       FROM public.plan_types`
  )

  const schemaRes = await client.query<{ count: number }>(
    `SELECT CASE
              WHEN to_regclass('public.adonis_schema') IS NOT NULL
              THEN (SELECT COUNT(*)::int FROM public.adonis_schema)
              ELSE 0
            END AS count`
  )

  const bucketsRes = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.rate_limit_buckets') IS NOT NULL AS exists`
  )

  const constraintsRes = await client.query<{ conname: string }>(
    `SELECT conname
       FROM pg_constraint
      WHERE conrelid = 'public.plans'::regclass
        AND contype = 'c'
      ORDER BY conname ASC`
  )

  const rlsRes = await client.query<{ relname: string }>(
    `SELECT relname
       FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
        AND relrowsecurity = true
      ORDER BY relname ASC`
  )

  return {
    counts,
    aggregates: {
      plansPriceSum: plansAgg.rows[0]?.price_sum ?? '0.00',
      plansLessonsTotalSum: plansAgg.rows[0]?.lessons_sum ?? '0',
      planDiscountsAmountSum: discountsAgg.rows[0]?.amount_sum ?? '0.00',
      planTypesPriceSum: planTypesAgg.rows[0]?.price_sum ?? '0.00',
    },
    metadata: {
      migrationsCount: schemaRes.rows[0]?.count ?? 0,
      hasRateLimitBucketsTable: Boolean(bucketsRes.rows[0]?.exists),
      planConstraints: constraintsRes.rows.map((r) => r.conname),
      rlsEnabledTables: rlsRes.rows.map((r) => r.relname),
    },
  }
}

export function compareMigrationParity(
  source: DatabaseSnapshot,
  target: DatabaseSnapshot,
  options: ParityComparisonOptions = {}
): ParityReport {
  const failures: string[] = []

  const tableChecks: TableParityCheck[] = V1_CORE_TABLES.map((table) => {
    const sourceCount = source.counts[table]
    const targetCount = target.counts[table]
    const match = sourceCount === targetCount
    if (!match) {
      failures.push(`Table '${table}' count mismatch: source=${sourceCount}, target=${targetCount}`)
    }
    return { table, sourceCount, targetCount, match }
  })

  const aggregatePairs: Array<{ metric: string; sourceValue: string; targetValue: string }> = [
    {
      metric: 'plans.SUM(price)',
      sourceValue: source.aggregates.plansPriceSum,
      targetValue: target.aggregates.plansPriceSum,
    },
    {
      metric: 'plans.SUM(lessons_total)',
      sourceValue: source.aggregates.plansLessonsTotalSum,
      targetValue: target.aggregates.plansLessonsTotalSum,
    },
    {
      metric: 'plan_discounts.SUM(amount)',
      sourceValue: source.aggregates.planDiscountsAmountSum,
      targetValue: target.aggregates.planDiscountsAmountSum,
    },
    {
      metric: 'plan_types.SUM(price)',
      sourceValue: source.aggregates.planTypesPriceSum,
      targetValue: target.aggregates.planTypesPriceSum,
    },
  ]

  const aggregateChecks: AggregateParityCheck[] = aggregatePairs.map((pair) => {
    const match = pair.sourceValue === pair.targetValue
    if (!match) {
      failures.push(
        `Aggregate '${pair.metric}' mismatch: source=${pair.sourceValue}, target=${pair.targetValue}`
      )
    }
    return { ...pair, match }
  })

  const postMigrateChecks: PostMigrateCheck[] = []

  if (options.postMigrate) {
    const expectedMigrations = options.expectedMigrationsCount ?? 21
    const migMatch = target.metadata.migrationsCount === expectedMigrations
    postMigrateChecks.push({
      check: 'adonis_schema migrations count',
      expected: String(expectedMigrations),
      actual: String(target.metadata.migrationsCount),
      match: migMatch,
    })
    if (!migMatch) {
      failures.push(
        `Expected ${expectedMigrations} migrations in target adonis_schema, found ${target.metadata.migrationsCount}`
      )
    }

    const bucketsMatch = target.metadata.hasRateLimitBucketsTable
    postMigrateChecks.push({
      check: 'rate_limit_buckets table exists',
      expected: 'true',
      actual: String(bucketsMatch),
      match: bucketsMatch,
    })
    if (!bucketsMatch) {
      failures.push(`Table 'rate_limit_buckets' is missing in target database`)
    }

    for (const constraint of V2_EXPECTED_PLAN_CONSTRAINTS) {
      const present = target.metadata.planConstraints.includes(constraint)
      postMigrateChecks.push({
        check: `plans constraint '${constraint}'`,
        expected: 'present',
        actual: present ? 'present' : 'missing',
        match: present,
      })
      if (!present) {
        failures.push(`Financial CHECK constraint '${constraint}' missing on target 'plans' table`)
      }
    }

    const missingRls = V2_EXPECTED_RLS_TABLES.filter(
      (t) => !target.metadata.rlsEnabledTables.includes(t)
    )
    const rlsMatch = missingRls.length === 0
    postMigrateChecks.push({
      check: `RLS enabled on all ${V2_EXPECTED_RLS_TABLES.length} tables`,
      expected: V2_EXPECTED_RLS_TABLES.join(', '),
      actual:
        V2_EXPECTED_RLS_TABLES.filter((t) => target.metadata.rlsEnabledTables.includes(t)).join(
          ', '
        ) || 'none',
      match: rlsMatch,
    })
    if (!rlsMatch) {
      failures.push(`RLS is NOT enabled on target tables: ${missingRls.join(', ')}`)
    }
  }

  return {
    passed: failures.length === 0,
    checkedAt: new Date().toISOString(),
    tableChecks,
    aggregateChecks,
    postMigrateChecks,
    failures,
  }
}
