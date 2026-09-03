import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Student from '#models/student'

const studentPayload = {
  name: 'Maria Silva',
  instrument: 'violão',
  phone: '11999999999',
  birthdate: '2010-05-20',
  description: 'Iniciante',
}

test.group('Students', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/students')
    response.assertStatus(401)
  })

  test('creates a student for the authenticated teacher', async ({ assert, client }) => {
    const user = await createTeacher()

    const response = await client.post('/api/v1/students').loginAs(user).json(studentPayload)

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        name: 'Maria Silva',
        instrument: 'violão',
        phone: '11999999999',
        description: 'Iniciante',
        userId: user.id,
      },
    })

    const student = await Student.findOrFail(response.body().data.id)
    assert.equal(student.userId, user.id)
    assert.equal(student.name, 'Maria Silva')
  })

  test('rejects invalid payloads', async ({ client }) => {
    const user = await createTeacher()

    const response = await client.post('/api/v1/students').loginAs(user).json({
      name: '',
      instrument: '',
    })

    response.assertStatus(422)
  })

  test('lists only the authenticated teacher students', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const otherTeacher = await createTeacher({ email: 'other@example.com' })

    await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    await otherTeacher.related('students').create({ name: 'Bruno', instrument: 'bateria' })

    const response = await client.get('/api/v1/students').loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [{ name: 'Ana', instrument: 'piano', userId: teacher.id }],
    })
  })

  test('shows a student owned by the teacher', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })

    const response = await client.get(`/api/v1/students/${student.id}`).loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: student.id,
        name: 'Ana',
        instrument: 'piano',
      },
    })
  })

  test('does not show a student from another teacher', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const otherTeacher = await createTeacher({ email: 'other@example.com' })
    const student = await otherTeacher.related('students').create({
      name: 'Bruno',
      instrument: 'bateria',
    })

    const response = await client.get(`/api/v1/students/${student.id}`).loginAs(teacher)
    response.assertStatus(404)
  })

  test('updates a student owned by the teacher', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })

    const response = await client.put(`/api/v1/students/${student.id}`).loginAs(teacher).json({
      name: 'Ana Clara',
      instrument: 'violão',
      preferredWeekday: 2,
      preferredTime: '14:00',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: student.id,
        name: 'Ana Clara',
        instrument: 'violão',
        preferredWeekday: 2,
        preferredTime: '14:00',
      },
    })
  })

  test('stores a preferred weekday and time on create', async ({ client }) => {
    const user = await createTeacher()

    const response = await client.post('/api/v1/students').loginAs(user).json({
      ...studentPayload,
      preferredWeekday: 3,
      preferredTime: '09:30',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        name: 'Maria Silva',
        preferredWeekday: 3,
        preferredTime: '09:30',
      },
    })
  })

  test('deletes a student owned by the teacher', async ({ assert, client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })

    const response = await client.delete(`/api/v1/students/${student.id}`).loginAs(teacher)

    response.assertStatus(204)
    assert.isNull(await Student.find(student.id))
  })

  test('exposes remaining credits from paid and pending plans', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })
    const plan = await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'paid',
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
      scheduledAt: DateTime.fromISO('2026-09-01T14:00:00.000Z'),
      status: 'scheduled',
    })

    const response = await client.get(`/api/v1/students/${student.id}`).loginAs(teacher)
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: student.id,
        creditsRemaining: 5,
        activePlansCount: 2,
      },
    })
  })
})

function createTeacher(overrides: { email?: string; fullName?: string } = {}) {
  return User.create({
    fullName: overrides.fullName ?? 'Teacher',
    email: overrides.email ?? 'teacher@example.com',
    password: 'password123',
  })
}
