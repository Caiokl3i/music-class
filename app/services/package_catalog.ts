export const DEFAULT_PLAN_TYPES = [
  { slug: 'single', label: 'Aula avulsa', lessons: 1, price: 35 },
  { slug: 'pack_4', label: 'Pacote mensal 1', lessons: 4, price: 130 },
  { slug: 'pack_8', label: 'Pacote mensal 2', lessons: 8, price: 240 },
] as const

export type DefaultPlanSlug = (typeof DEFAULT_PLAN_TYPES)[number]['slug']

export const PACKAGES = Object.fromEntries(
  DEFAULT_PLAN_TYPES.map((item) => [
    item.slug,
    { lessons: item.lessons, price: item.price, label: item.label },
  ])
) as {
  [K in DefaultPlanSlug]: { lessons: number; price: number; label: string }
}

export const PLAN_PACKAGES = DEFAULT_PLAN_TYPES.map((item) => item.slug)

export type PlanPackage = string

export const LESSON_DURATION_MINUTES = 60
export const CREDIT_VALIDITY_DAYS = 60
export const LOW_CREDIT_THRESHOLD = 1
export const EXPIRING_SOON_DAYS = 7
