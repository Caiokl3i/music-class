import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Lesson from '#models/lesson'
import { PACKAGES } from '#validators/plan'

const scheduledAt = '2026-09-01T14:00:00.000Z'

test.group('Lessons', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/lessons')
    response.assertStatus(401)
  })

  test('creates a lesson defaulting to scheduled', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan()

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
      description: 'Escala maior',
    })

    response.assertStatus(201)
    response.assertBodyContains({
      data: {
        studentId: student.id,
        planId: plan.id,
        userId: teacher.id,
        status: 'scheduled',
        description: 'Escala maior',
      },
    })
  })

  test('rejects invalid payloads', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: 1,
      planId: 1,
      status: 'invalid',
    })

    response.assertStatus(422)
  })

  test('rejects creating a lesson for a student from another teacher', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const { student, plan } = await createTeacherWithPlan({ email: 'other@example.com' })

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
    })

    response.assertStatus(404)
  })

  test('rejects creating a lesson on a plan from another teacher', async ({ client }) => {
    const { teacher, student } = await createTeacherWithPlan({ email: 'teacher@example.com' })
    const { plan } = await createTeacherWithPlan({ email: 'other@example.com' })

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
    })

    response.assertStatus(404)
  })

  test('rejects a student that does not belong to the plan', async ({ client }) => {
    const { teacher, plan } = await createTeacherWithPlan()
    const otherStudent = await teacher.related('students').create({
      name: 'Bruno',
      instrument: 'violão',
    })

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: otherStudent.id,
      planId: plan.id,
      scheduledAt,
    })

    response.assertStatus(422)
  })

  test('lists only the authenticated teacher lessons', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({
      email: 'teacher@example.com',
    })
    const other = await createTeacherWithPlan({ email: 'other@example.com' })

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })
    await other.teacher.related('lessons').create({
      studentId: other.student.id,
      planId: other.plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'done',
    })

    const response = await client.get('/api/v1/lessons').loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: [{ studentId: student.id, planId: plan.id, userId: teacher.id }],
    })
  })

  test('filters lessons by studentId and planId', async ({ client }) => {
    const teacher = await createTeacher()
    const ana = await teacher.related('students').create({ name: 'Ana', instrument: 'piano' })
    const bruno = await teacher.related('students').create({ name: 'Bruno', instrument: 'violão' })
    const anaPlan = await createPlan(teacher, ana.id, 'pack_4')
    const brunoPlan = await createPlan(teacher, bruno.id, 'single')

    await teacher.related('lessons').create({
      studentId: ana.id,
      planId: anaPlan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })
    await teacher.related('lessons').create({
      studentId: bruno.id,
      planId: brunoPlan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })

    const byStudent = await client.get(`/api/v1/lessons?studentId=${ana.id}`).loginAs(teacher)
    byStudent.assertStatus(200)
    byStudent.assertBodyContains({
      data: [{ studentId: ana.id, planId: anaPlan.id }],
    })

    const byPlan = await client.get(`/api/v1/lessons?planId=${brunoPlan.id}`).loginAs(teacher)
    byPlan.assertStatus(200)
    byPlan.assertBodyContains({
      data: [{ studentId: bruno.id, planId: brunoPlan.id }],
    })
  })

  test('shows a lesson owned by the teacher', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan()
    const lesson = await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })

    const response = await client.get(`/api/v1/lessons/${lesson.id}`).loginAs(teacher)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: lesson.id,
        status: 'scheduled',
        planId: plan.id,
      },
    })
  })

  test('does not show a lesson from another teacher', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const other = await createTeacherWithPlan({ email: 'other@example.com' })
    const lesson = await other.teacher.related('lessons').create({
      studentId: other.student.id,
      planId: other.plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })

    const response = await client.get(`/api/v1/lessons/${lesson.id}`).loginAs(teacher)
    response.assertStatus(404)
  })

  test('updates a lesson owned by the teacher', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan()
    const lesson = await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })

    const response = await client.put(`/api/v1/lessons/${lesson.id}`).loginAs(teacher).json({
      status: 'done',
      description: 'Arpejos',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: lesson.id,
        status: 'done',
        description: 'Arpejos',
      },
    })
  })

  test('deletes a lesson owned by the teacher', async ({ assert, client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan()
    const lesson = await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO(scheduledAt),
      status: 'scheduled',
    })

    const response = await client.delete(`/api/v1/lessons/${lesson.id}`).loginAs(teacher)

    response.assertStatus(204)
    assert.isNull(await Lesson.find(lesson.id))
  })

  test('does not allow more active lessons than the plan credits', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'single' })

    const first = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
    })
    first.assertStatus(201)

    const second = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: '2026-09-08T14:00:00.000Z',
    })
    second.assertStatus(422)
  })

  test('no_show consumes credit and cancelled returns it', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'single' })

    const created = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
      status: 'no_show',
    })
    created.assertStatus(201)

    const blocked = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: '2026-09-08T14:00:00.000Z',
    })
    blocked.assertStatus(422)

    const cancelled = await client
      .put(`/api/v1/lessons/${created.body().data.id}`)
      .loginAs(teacher)
      .json({ status: 'cancelled' })
    cancelled.assertStatus(200)

    const reused = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: '2026-09-08T14:00:00.000Z',
    })
    reused.assertStatus(201)
  })

  test('does not consume credits on a cancelled plan', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan()
    plan.status = 'cancelled'
    await plan.save()

    const response = await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
    })

    response.assertStatus(422)
  })

  test('exposes remaining credits on the plan', async ({ client }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({ package: 'pack_4' })

    await client.post('/api/v1/lessons').loginAs(teacher).json({
      studentId: student.id,
      planId: plan.id,
      scheduledAt,
    })

    const response = await client.get(`/api/v1/plans/${plan.id}`).loginAs(teacher)
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: plan.id,
        lessonsTotal: 4,
        lessonsRemaining: 3,
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

async function createTeacherWithPlan(
  overrides: {
    email?: string
    package?: keyof typeof PACKAGES
  } = {}
) {
  const teacher = await createTeacher({ email: overrides.email })
  const student = await teacher.related('students').create({
    name: 'Ana',
    instrument: 'piano',
  })
  const plan = await createPlan(teacher, student.id, overrides.package ?? 'pack_4')

  return { teacher, student, plan }
}

function createPlan(teacher: User, studentId: number, pack: keyof typeof PACKAGES = 'pack_4') {
  const catalog = PACKAGES[pack]

  return teacher.related('plans').create({
    studentId,
    package: pack,
    lessonsTotal: catalog.lessons,
    price: catalog.price,
    status: 'paid',
  })
}
