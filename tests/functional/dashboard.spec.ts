import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { createTeacherWithPlan } from '#tests/helpers'

test.group('Dashboard', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/dashboard')
    response.assertStatus(401)
  })

  test('returns studio totals, today, overdue, upcoming and recent activity', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'pack_8' })
    const now = DateTime.now().setZone('UTC')

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.minus({ days: 2 }).set({ hour: 14 }),
      status: 'scheduled',
    })
    const todayLesson = await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.set({ hour: 16, minute: 0, second: 0, millisecond: 0 }),
      status: 'scheduled',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.plus({ days: 3 }).set({ hour: 14 }),
      status: 'scheduled',
    })
    const done = await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.minus({ days: 5 }).set({ hour: 14 }),
      status: 'done',
    })

    const response = await client.get('/api/v1/dashboard?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)

    const body = response.body().data
    assert.equal(body.studentCount, 1)
    assert.equal(body.activePlans, 1)
    assert.equal(body.scheduledCount, 3)
    assert.equal(body.doneCount, 1)
    assert.equal(Number(body.revenue), 240)
    assert.equal(Number(body.revenueThisMonth), 240)
    assert.equal(body.pendingPlans, 0)
    assert.lengthOf(body.unpaidPlans, 0)
    assert.lengthOf(body.lowCredits, 0)
    assert.lengthOf(body.overdue, 1)
    assert.equal(body.today[0].id, todayLesson.id)
    assert.equal(body.today[0].studentName, 'Ana')
    assert.lengthOf(body.upcoming, 1)
    assert.equal(body.recent[0].id, done.id)
    assert.equal(body.recent[0].studentName, 'Ana')
  })

  test('does not include another teacher data', async ({ assert, client }) => {
    const { teacher } = await createTeacherWithPlan({ email: 'teacher@example.com' })
    await createTeacherWithPlan({ email: 'other@example.com' })

    const response = await client.get('/api/v1/dashboard?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)
    assert.equal(response.body().data.studentCount, 1)
  })

  test('splits this month revenue from lifetime and flags low credits', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'pack_4' })
    const now = DateTime.now().setZone('UTC')

    await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_8',
      lessonsTotal: 8,
      price: 240,
      status: 'paid',
      paidAt: now.minus({ months: 2 }),
    })
    await teacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.plus({ days: 1 }).set({ hour: 14 }),
      status: 'done',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.plus({ days: 8 }).set({ hour: 14 }),
      status: 'done',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now.plus({ days: 15 }).set({ hour: 14 }),
      status: 'done',
    })

    const response = await client.get('/api/v1/dashboard?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)

    const body = response.body().data
    assert.equal(Number(body.revenue), 370)
    assert.equal(Number(body.revenueThisMonth), 130)
    assert.equal(body.pendingPlans, 1)
    assert.equal(Number(body.pendingAmount), 35)
    assert.lengthOf(body.unpaidPlans, 1)
    assert.equal(body.unpaidPlans[0].status, 'pending')
    assert.lengthOf(body.lowCredits, 1)
    assert.equal(body.lowCredits[0].lessonsRemaining, 1)
    assert.equal(body.lowCredits[0].status, 'paid')
  })

  test('finished paid packs are not alerts; finished unpaid packs stay to collect', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'pack_4' })
    const now = DateTime.now().setZone('UTC')

    for (const days of [1, 8, 15, 22]) {
      await teacher.related('lessons').create({
        studentId: student.id,
        planId: plan.id,
        scheduledAt: now.minus({ days }).set({ hour: 14 }),
        status: 'done',
      })
    }

    const unpaid = await teacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: unpaid.id,
      scheduledAt: now.minus({ days: 3 }).set({ hour: 14 }),
      status: 'done',
    })

    const response = await client.get('/api/v1/dashboard?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)

    const body = response.body().data
    assert.lengthOf(body.lowCredits, 0)
    assert.lengthOf(body.unpaidPlans, 1)
    assert.equal(body.unpaidPlans[0].planId, unpaid.id)
    assert.equal(body.unpaidPlans[0].lessonsRemaining, 0)
  })
})
