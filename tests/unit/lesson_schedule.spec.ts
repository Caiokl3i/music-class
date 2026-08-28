import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { windowsOverlap, weeklySlots, lessonEnd } from '#services/lesson_schedule'
import {
  expiresAtFromPaidAt,
  isNewCreditConsumption,
  planIsExpired,
  usableCreditsFromCount,
} from '#services/plan_credits'
import { CREDIT_VALIDITY_DAYS } from '#services/package_catalog'

test.group('Lesson schedule', () => {
  test('treats back-to-back hours as free and overlapping starts as conflict', ({ assert }) => {
    const two = DateTime.fromISO('2026-09-01T14:00:00.000Z')
    const three = DateTime.fromISO('2026-09-01T15:00:00.000Z')
    const halfPast = DateTime.fromISO('2026-09-01T14:30:00.000Z')

    assert.isFalse(windowsOverlap(two, three))
    assert.isFalse(windowsOverlap(three, two))
    assert.isTrue(windowsOverlap(two, two))
    assert.isTrue(windowsOverlap(two, halfPast))
    assert.equal(lessonEnd(two).toISO(), three.toISO())
  })

  test('builds weekly slots and stops at expiry', ({ assert }) => {
    const first = DateTime.fromISO('2026-09-01T14:00:00.000Z')
    const until = DateTime.fromISO('2026-09-10T00:00:00.000Z')

    const all = weeklySlots(first, 4)
    assert.lengthOf(all, 4)
    assert.equal(all[1].toUTC().toMillis(), DateTime.fromISO('2026-09-08T14:00:00.000Z').toMillis())
    assert.equal(all[3].toUTC().toMillis(), DateTime.fromISO('2026-09-22T14:00:00.000Z').toMillis())

    const clipped = weeklySlots(first, 4, until)
    assert.lengthOf(clipped, 2)
    assert.equal(clipped[1].toUTC().toMillis(), DateTime.fromISO('2026-09-08T14:00:00.000Z').toMillis())
  })
})

test.group('Plan expiry', () => {
  test('sets validity from paidAt only when the plan becomes paid', ({ assert }) => {
    const paidAt = DateTime.fromISO('2026-08-01T12:00:00.000Z')
    const created = expiresAtFromPaidAt('paid', paidAt)
    assert.equal(created?.toISO(), paidAt.plus({ days: CREDIT_VALIDITY_DAYS }).toISO())

    const kept = expiresAtFromPaidAt(
      'paid',
      paidAt,
      paidAt.plus({ days: 10 }),
      'paid'
    )
    assert.equal(kept?.toISO(), paidAt.plus({ days: 10 }).toISO())

    const grandfathered = expiresAtFromPaidAt('paid', paidAt, null, 'paid')
    assert.isNull(grandfathered)

    assert.isNull(expiresAtFromPaidAt('pending', paidAt))
  })

  test('only new consumption is blocked after expiry', ({ assert }) => {
    assert.isTrue(isNewCreditConsumption('scheduled'))
    assert.isFalse(isNewCreditConsumption('done', 'scheduled'))
    assert.isTrue(isNewCreditConsumption('scheduled', 'cancelled'))
    assert.isTrue(
      planIsExpired({ expiresAt: DateTime.now().minus({ days: 1 }) })
    )
    assert.equal(
      usableCreditsFromCount(
        { status: 'paid', expiresAt: DateTime.now().minus({ days: 1 }), lessonsTotal: 4 },
        1
      ),
      0
    )
  })
})
