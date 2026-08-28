import type { PlanPackage } from '@/types/api'

export const PACKAGES = {
  single: { lessons: 1, price: 35, label: 'Aula avulsa' },
  pack_4: { lessons: 4, price: 130, label: 'Pacote mensal 1' },
  pack_8: { lessons: 8, price: 240, label: 'Pacote mensal 2' },
} as const satisfies Record<
  PlanPackage,
  { lessons: number; price: number; label: string }
>

export const PLAN_STATUSES = ['pending', 'paid', 'cancelled'] as const
export const LESSON_STATUSES = ['scheduled', 'done', 'cancelled', 'no_show'] as const

export const PACKAGE_OPTIONS = (Object.keys(PACKAGES) as PlanPackage[]).map((key) => ({
  value: key,
  ...PACKAGES[key],
}))
