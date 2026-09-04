import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  buildBillingSummary,
  filterBillingDiscounts,
  filterDoneLessons,
  formatBillingText,
  formatMoneyBr,
  monthLabelPt,
} from '#services/billing_message'
import { netPriceFromPlan, roundMoney, unitPriceFromPlan } from '#services/plan_pricing'
import type Plan from '#models/plan'
import type PlanDiscount from '#models/plan_discount'
import type Lesson from '#models/lesson'

test.group('Plan pricing', () => {
  test('computes unit price and net price', ({ assert }) => {
    assert.equal(unitPriceFromPlan(130, 4), 32.5)
    assert.equal(unitPriceFromPlan(240, 8), 30)
    assert.equal(unitPriceFromPlan(35, 1), 35)
    assert.equal(unitPriceFromPlan(100, 0), 0)
    assert.equal(roundMoney(10.005), 10.01)

    const discounts = [{ amount: 25 }, { amount: 10 }] as PlanDiscount[]
    assert.equal(netPriceFromPlan(130, discounts), 95)
    assert.equal(netPriceFromPlan(20, discounts), 0)
  })
})

test.group('Billing message', () => {
  test('formats brazilian money and month labels', ({ assert }) => {
    assert.equal(formatMoneyBr(55), 'R$\u00a055,00')
    assert.equal(monthLabelPt('2026-02'), 'fevereiro')
    assert.equal(monthLabelPt('2026-03'), 'março')
  })

  test('filters done lessons and discounts by month', ({ assert }) => {
    const zone = 'America/Sao_Paulo'
    const lessons = [
      {
        id: 1,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-02-13T17:00:00', { zone }),
      },
      {
        id: 2,
        status: 'scheduled',
        scheduledAt: DateTime.fromISO('2026-02-20T17:00:00', { zone }),
      },
      {
        id: 3,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-03-06T17:00:00', { zone }),
      },
    ] as Lesson[]

    const february = filterDoneLessons(lessons, '2026-02', zone)
    assert.lengthOf(february, 1)
    assert.equal(february[0].id, 1)

    const allDone = filterDoneLessons(lessons, null, zone)
    assert.lengthOf(allDone, 2)

    const discounts = [
      {
        id: 1,
        amount: 25,
        serviceAt: DateTime.fromISO('2026-02-14'),
        createdAt: DateTime.fromISO('2026-02-14'),
      },
      {
        id: 2,
        amount: 10,
        serviceAt: DateTime.fromISO('2026-03-01'),
        createdAt: DateTime.fromISO('2026-03-01'),
      },
      {
        id: 3,
        amount: 5,
        serviceAt: null,
        createdAt: DateTime.fromISO('2026-01-01'),
      },
    ] as PlanDiscount[]

    const febDiscounts = filterBillingDiscounts(discounts, '2026-02', zone)
    assert.lengthOf(febDiscounts, 2)
    assert.deepEqual(
      febDiscounts.map((item) => item.id),
      [3, 1]
    )
  })

  test('builds text matching the cobrança layout', ({ assert }) => {
    const plan = { id: 9, price: 110, lessonsTotal: 4 } as Plan
    const zone = 'America/Sao_Paulo'
    const lessons = [
      {
        id: 1,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-02-13T17:00:00', { zone }),
      },
      {
        id: 2,
        status: 'done',
        scheduledAt: DateTime.fromISO('2026-02-27T17:00:00', { zone }),
      },
    ] as Lesson[]
    const discounts = [
      {
        id: 1,
        name: 'Desconto sobrancelhas',
        amount: 25,
        serviceAt: DateTime.fromISO('2026-02-14'),
        createdAt: DateTime.fromISO('2026-02-14'),
      },
    ] as PlanDiscount[]

    const summary = buildBillingSummary({
      plan,
      lessons,
      discounts,
      month: '2026-02',
      timezone: zone,
      studentName: 'Ana',
    })

    assert.equal(summary.unitPrice, 27.5)
    assert.equal(summary.lessonsSubtotal, 55)
    assert.equal(summary.discountTotal, 25)
    assert.equal(summary.total, 30)
    assert.include(summary.text, 'Informações sobre as aulas de fevereiro')
    assert.include(summary.text, '13/02')
    assert.include(summary.text, '27/02')
    assert.include(summary.text, '→ Total das aulas: R$')
    assert.include(summary.text, 'Desconto sobrancelhas:')
    assert.include(summary.text, '14/02')
    assert.include(summary.text, '| Valor total: R$')
  })

  test('omits discount sections and clamps total at zero', ({ assert }) => {
    const text = formatBillingText({
      month: null,
      lessons: [],
      lessonsSubtotal: 0,
      discounts: [],
      total: 0,
    })
    assert.include(text, 'Informações sobre as aulas')
    assert.include(text, '(nenhuma)')
    assert.notInclude(text, 'Desconto')

    const summary = buildBillingSummary({
      plan: { id: 1, price: 35, lessonsTotal: 1 } as Plan,
      lessons: [
        {
          id: 1,
          status: 'done',
          scheduledAt: DateTime.fromISO('2026-02-01T12:00:00', { zone: 'UTC' }),
        },
      ] as Lesson[],
      discounts: [
        {
          id: 1,
          name: 'Troca grande',
          amount: 100,
          serviceAt: null,
          createdAt: DateTime.now(),
        },
      ] as PlanDiscount[],
      month: null,
      timezone: 'UTC',
    })

    assert.equal(summary.total, 0)
  })
})
