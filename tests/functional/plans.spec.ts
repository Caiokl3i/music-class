import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Plan from '#models/plan'

test.group('Plans', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/plans')
    response.assertStatus(401)
  })

  test('creates a plan filling lessons and price from the package catalog', async ({
    assert,
    client,
  }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })

    const response = await client.post('/api/v1/plans').loginAs(teacher).json({
      studentId: student.id,
      package: 'pack_4',
      status: 'paid',
      notes: 'Pago no PIX',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        studentId: student.id,
        userId: teacher.id,
        package: 'pack_4',
        lessonsTotal: 4,
        lessonsRemaining: 4,
        status: 'paid',
        notes: 'Pago no PIX',
      },
    })

    const plan = await Plan.findOrFail(response.body().data.id)
    assert.equal(Number(plan.price), 130)
    assert.equal(Number(response.body().data.price), 130)
    assert.isNotNull(plan.paidAt)
  })

  test('defaults a new plan to pending without paidAt', async ({ assert, client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })

    const response = await client.post('/api/v1/plans').loginAs(teacher).json({
      studentId: student.id,
      package: 'single',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        package: 'single',
        lessonsTotal: 1,
        status: 'pending',
      },
    })
    assert.equal(Number(response.body().data.price), 35)
    assert.isNull(response.body().data.paidAt)
  })

  test('rejects creating a plan for a student from another teacher', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const otherTeacher = await createTeacher({ email: 'other@example.com' })
    const student = await otherTeacher.related('students').create({
      name: 'Bruno',
      instrument: 'bateria',
    })

    const response = await client.post('/api/v1/plans').loginAs(teacher).json({
      studentId: student.id,
      package: 'pack_4',
    })

    response.assertStatus(404)
  })

  test('rejects invalid payloads', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.post('/api/v1/plans').loginAs(teacher).json({
      studentId: 1,
      package: 'invalid',
    })

    response.assertStatus(422)
  })

  test('lists only the authenticated teacher plans', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const otherTeacher = await createTeacher({ email: 'other@example.com' })
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const otherStudent = await otherTeacher
      .related('students')
      .create({ name: 'Bruno', instrument: 'bateria' })

    await teacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })
    await otherTeacher.related('plans').create({
      studentId: otherStudent.id,
      package: 'pack_8',
      lessonsTotal: 8,
      price: 240,
      status: 'paid',
    })

    const response = await client.get('/api/v1/plans').loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [{ studentId: student.id, package: 'single', userId: teacher.id }],
    })
  })

  test('filters plans by studentId', async ({ client }) => {
    const teacher = await createTeacher()
    const ana = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const bruno = await teacher.related('students').create({ name: 'Bruno', instrument: 'violão' })

    await teacher.related('plans').create({
      studentId: ana.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })
    await teacher.related('plans').create({
      studentId: bruno.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'paid',
    })

    const response = await client.get(`/api/v1/plans?studentId=${ana.id}`).loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [{ studentId: ana.id, package: 'single' }],
    })
  })

  test('shows a plan owned by the teacher', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'pending',
    })

    const response = await client.get(`/api/v1/plans/${plan.id}`).loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: plan.id,
        package: 'pack_4',
        lessonsTotal: 4,
      },
    })
  })

  test('does not show a plan from another teacher', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const otherTeacher = await createTeacher({ email: 'other@example.com' })
    const student = await otherTeacher
      .related('students')
      .create({ name: 'Bruno', instrument: 'bateria' })
    const plan = await otherTeacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })

    const response = await client.get(`/api/v1/plans/${plan.id}`).loginAs(teacher)
    response.assertStatus(404)
  })

  test('updates package using catalog values and can mark as paid', async ({ assert, client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })

    const response = await client.put(`/api/v1/plans/${plan.id}`).loginAs(teacher).json({
      package: 'pack_8',
      status: 'paid',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: plan.id,
        package: 'pack_8',
        lessonsTotal: 8,
        status: 'paid',
      },
    })
    assert.equal(Number(response.body().data.price), 240)
    assert.isNotNull(response.body().data.paidAt)
  })

  test('does not reduce plan credits below active lessons', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'paid',
    })

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-01T14:00:00.000Z'),
      status: 'scheduled',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-08T14:00:00.000Z'),
      status: 'done',
    })

    const response = await client.put(`/api/v1/plans/${plan.id}`).loginAs(teacher).json({
      package: 'single',
    })

    response.assertStatus(422)
  })

  test('exposes lessonsRemaining on list and show', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'paid',
    })

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-01T14:00:00.000Z'),
      status: 'scheduled',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-08T14:00:00.000Z'),
      status: 'cancelled',
    })

    const list = await client.get('/api/v1/plans').loginAs(teacher)
    list.assertStatus(200)
    list.assertBodyContains({
      data: [{ id: plan.id, lessonsTotal: 4, lessonsRemaining: 3 }],
    })

    const show = await client.get(`/api/v1/plans/${plan.id}`).loginAs(teacher)
    show.assertStatus(200)
    show.assertBodyContains({
      data: { id: plan.id, lessonsTotal: 4, lessonsRemaining: 3 },
    })
  })

  test('deletes a plan owned by the teacher', async ({ assert, client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'pending',
    })

    const response = await client.delete(`/api/v1/plans/${plan.id}`).loginAs(teacher)

    response.assertStatus(204)
    assert.isNull(await Plan.find(plan.id))
  })
})

function createTeacher(overrides: { email?: string; fullName?: string } = {}) {
  return User.create({
    fullName: overrides.fullName ?? 'Teacher',
    email: overrides.email ?? 'teacher@example.com',
    password: 'password123',
  })
}
