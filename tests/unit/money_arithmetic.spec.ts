/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import {
  discountTotalFromList,
  netPriceFromPlan,
  roundMoney,
  unitPriceFromPlan,
} from '#services/plan_pricing'
import type PlanDiscount from '#models/plan_discount'

test.group('Money Arithmetic (Characterization)', () => {
  test('roundMoney eliminates IEEE-754 binary floating-point errors', ({ assert }) => {
    // 0.1 + 0.2 produces 0.30000000000000004 in standard JS
    assert.equal(roundMoney(0.1 + 0.2), 0.3)

    // Fractional cents rounding with Number.EPSILON
    assert.equal(roundMoney(10.004), 10.0)
    assert.equal(roundMoney(10.005), 10.01)
    assert.equal(roundMoney(10.006), 10.01)
    assert.equal(roundMoney(1.005), 1.01)
    assert.equal(roundMoney(35.555), 35.56)
  })

  test('unitPriceFromPlan guards against zero or negative lessons and rounds correctly', ({
    assert,
  }) => {
    assert.equal(unitPriceFromPlan(100, 0), 0)
    assert.equal(unitPriceFromPlan(100, -2), 0)
    assert.equal(unitPriceFromPlan(0, 4), 0)

    // Standard packages
    assert.equal(unitPriceFromPlan(130, 4), 32.5)
    assert.equal(unitPriceFromPlan(240, 8), 30)

    // Periodic decimals: 100 / 3 = 33.333333... -> 33.33
    assert.equal(unitPriceFromPlan(100, 3), 33.33)

    // Real world uneven division: R$ 235.50 / 8 = 29.4375 -> 29.44
    assert.equal(unitPriceFromPlan(235.5, 8), 29.44)
  })

  test('discountTotalFromList safely aggregates discounts and converts numeric strings', ({
    assert,
  }) => {
    assert.equal(discountTotalFromList(null), 0)
    assert.equal(discountTotalFromList(undefined), 0)
    assert.equal(discountTotalFromList([]), 0)

    const list = [
      { amount: 15.25 },
      { amount: 10.33 },
      { amount: '5.01' as unknown as number },
    ] as PlanDiscount[]

    assert.equal(discountTotalFromList(list), 30.59)
  })

  test('netPriceFromPlan clamps to zero when discounts exceed the package price', ({ assert }) => {
    const discountsExceeding = [{ amount: 70 }, { amount: 50 }] as PlanDiscount[]
    assert.equal(netPriceFromPlan(100, discountsExceeding), 0)

    const exactDiscounts = [{ amount: 130 }] as PlanDiscount[]
    assert.equal(netPriceFromPlan(130, exactDiscounts), 0)

    const normalDiscounts = [{ amount: 25.5 }] as PlanDiscount[]
    assert.equal(netPriceFromPlan(130, normalDiscounts), 104.5)
  })
})
