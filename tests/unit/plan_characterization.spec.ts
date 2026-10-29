/// <reference types="@japa/assert" />
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  creditBlockReason,
  isNewCreditConsumption,
  lessonCompletesPackage,
  lessonConsumesCredit,
  planIsExpired,
  remainingCreditsFromCount,
  usableCreditsFromCount,
} from '#services/plan_credits'

test.group('Plan Credits and Status (Characterization)', () => {
  test('characterizes credit consumption and completion per lesson status', ({ assert }) => {
    // Scheduled consumes credit (reserves slot), but is not finished yet
    assert.isTrue(lessonConsumesCredit('scheduled'))
    assert.isFalse(lessonCompletesPackage('scheduled'))

    // Done consumes credit and counts toward package completion
    assert.isTrue(lessonConsumesCredit('done'))
    assert.isTrue(lessonCompletesPackage('done'))

    // No-show (student missed without notice) consumes credit, does not complete package
    assert.isTrue(lessonConsumesCredit('no_show'))
    assert.isFalse(lessonCompletesPackage('no_show'))

    // Cancelled frees credit and does not count toward package
    assert.isFalse(lessonConsumesCredit('cancelled'))
    assert.isFalse(lessonCompletesPackage('cancelled'))
  })

  test('isNewCreditConsumption detects when a state transition requires a fresh credit', ({
    assert,
  }) => {
    // New lessons
    assert.isTrue(isNewCreditConsumption('scheduled', undefined))
    assert.isTrue(isNewCreditConsumption('done', undefined))
    assert.isFalse(isNewCreditConsumption('cancelled', undefined))

    // Existing lessons transitions
    assert.isFalse(isNewCreditConsumption('done', 'scheduled'))
    assert.isFalse(isNewCreditConsumption('scheduled', 'done'))
    assert.isFalse(isNewCreditConsumption('cancelled', 'scheduled'))
    assert.isFalse(isNewCreditConsumption('cancelled', 'done'))

    // Reactivation from cancelled: consumes a new credit!
    assert.isTrue(isNewCreditConsumption('scheduled', 'cancelled'))
    assert.isTrue(isNewCreditConsumption('done', 'cancelled'))
  })

  test('usableCreditsFromCount blocks cancelled and expired plans while allowing pending', ({
    assert,
  }) => {
    const activeFuture = DateTime.now().plus({ days: 30 })
    const expiredPast = DateTime.now().minus({ days: 1 })

    // Paid plan with valid dates
    assert.equal(
      usableCreditsFromCount({ status: 'paid', expiresAt: activeFuture, lessonsTotal: 4 }, 1),
      3
    )

    // Pending plan with valid dates (can schedule before payment)
    assert.equal(
      usableCreditsFromCount({ status: 'pending', expiresAt: null, lessonsTotal: 4 }, 2),
      2
    )

    // Cancelled plan: immediately 0 usable credits
    assert.equal(
      usableCreditsFromCount({ status: 'cancelled', expiresAt: activeFuture, lessonsTotal: 4 }, 0),
      0
    )

    // Expired plan: immediately 0 usable credits
    assert.equal(
      usableCreditsFromCount({ status: 'paid', expiresAt: expiredPast, lessonsTotal: 4 }, 1),
      0
    )

    // Exhausted plan: 0
    assert.equal(
      usableCreditsFromCount({ status: 'paid', expiresAt: activeFuture, lessonsTotal: 4 }, 4),
      0
    )
  })

  test('planIsExpired correctly checks date presence and past boundary', ({ assert }) => {
    assert.isFalse(planIsExpired({ expiresAt: null }))
    assert.isFalse(planIsExpired({ expiresAt: undefined }))
    assert.isFalse(planIsExpired({ expiresAt: DateTime.now().plus({ hours: 1 }) }))
    assert.isTrue(planIsExpired({ expiresAt: DateTime.now().minus({ minutes: 1 }) }))
  })

  test('creditBlockReason returns exact reason for blocked consumption', ({ assert }) => {
    assert.equal(creditBlockReason('cancelled', 'scheduled'), 'cancelled')
    assert.equal(creditBlockReason('cancelled', 'done'), 'cancelled')
    assert.isNull(creditBlockReason('pending', 'scheduled'))
    assert.isNull(creditBlockReason('paid', 'scheduled'))
    assert.isNull(creditBlockReason('cancelled', 'cancelled'))
  })

  test('remainingCreditsFromCount returns difference including negative overconsumption', ({
    assert,
  }) => {
    assert.equal(remainingCreditsFromCount(4, 2), 2)
    assert.equal(remainingCreditsFromCount(4, 4), 0)
    assert.equal(remainingCreditsFromCount(4, 5), -1)
  })
})
