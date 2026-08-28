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
    assert.equal(body.pendingPlans, 0)
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
})
