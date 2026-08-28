import { test } from '@japa/runner'
import { creditBlockReason, lessonConsumesCredit, remainingCreditsFromCount } from '#services/plan_credits'

test.group('Plan credits', () => {
  test('scheduled, done and no_show consume credit', ({ assert }) => {
    assert.isTrue(lessonConsumesCredit('scheduled'))
    assert.isTrue(lessonConsumesCredit('done'))
    assert.isTrue(lessonConsumesCredit('no_show'))
    assert.isFalse(lessonConsumesCredit('cancelled'))
  })

  test('remaining credits subtract active lessons', ({ assert }) => {
    assert.equal(remainingCreditsFromCount(4, 1), 3)
    assert.equal(remainingCreditsFromCount(1, 1), 0)
  })

  test('blocks consumption on cancelled and unpaid plans', ({ assert }) => {
    assert.equal(creditBlockReason('cancelled', 'scheduled'), 'cancelled')
    assert.equal(creditBlockReason('pending', 'scheduled'), 'not_paid')
    assert.isNull(creditBlockReason('paid', 'scheduled'))
    assert.isNull(creditBlockReason('pending', 'cancelled'))
  })
})
