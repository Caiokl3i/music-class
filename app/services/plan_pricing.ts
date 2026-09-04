import type PlanDiscount from '#models/plan_discount'

export function discountTotalFromList(discounts: PlanDiscount[] | undefined | null) {
  if (!discounts?.length) return 0
  return roundMoney(discounts.reduce((sum, discount) => sum + Number(discount.amount), 0))
}

export function netPriceFromPlan(price: number, discounts: PlanDiscount[] | undefined | null) {
  return roundMoney(Math.max(0, Number(price) - discountTotalFromList(discounts)))
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function unitPriceFromPlan(price: number, lessonsTotal: number) {
  if (lessonsTotal <= 0) return 0
  return roundMoney(Number(price) / lessonsTotal)
}
