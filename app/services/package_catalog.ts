export const PACKAGES = {
  single: { lessons: 1, price: 35, label: 'Aula avulsa' },
  pack_4: { lessons: 4, price: 130, label: 'Pacote mensal 1' },
  pack_8: { lessons: 8, price: 240, label: 'Pacote mensal 2' },
} as const

export const PLAN_PACKAGES = ['single', 'pack_4', 'pack_8'] as const

export type PlanPackage = (typeof PLAN_PACKAGES)[number]

export function listPackages() {
  return PLAN_PACKAGES.map((value) => ({
    value,
    lessons: PACKAGES[value].lessons,
    price: PACKAGES[value].price,
    label: PACKAGES[value].label,
  }))
}
