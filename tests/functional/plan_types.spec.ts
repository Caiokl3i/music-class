import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createTeacher } from '#tests/helpers'

test.group('Plan types', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/plan-types')
    response.assertStatus(401)
  })

  test('lists the default plan types for a new teacher', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.get('/api/v1/plan-types').loginAs(teacher)
    response.assertStatus(200)
    response.assertBodyContains({
      data: [
        { slug: 'single', label: 'Aula avulsa', lessons: 1 },
        { slug: 'pack_4', label: 'Pacote mensal 1', lessons: 4 },
        { slug: 'pack_8', label: 'Pacote mensal 2', lessons: 8 },
      ],
    })
  })

  test('creates a custom plan type with a unique slug', async ({ assert, client }) => {
    const teacher = await createTeacher()

    const first = await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: 'Aula experimental',
      lessons: 1,
      price: 20,
    })
    first.assertStatus(201)
    first.assertBodyContains({
      data: {
        label: 'Aula experimental',
        slug: 'aula_experimental',
        lessons: 1,
        userId: teacher.id,
      },
    })
    assert.equal(Number(first.body().data.price), 20)

    const second = await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: 'Aula experimental',
      lessons: 2,
      price: 40,
    })
    second.assertStatus(201)
    second.assertBodyContains({
      data: { slug: 'aula_experimental_2', lessons: 2 },
    })
  })

  test('updates label, lessons and price without changing the slug', async ({ client }) => {
    const teacher = await createTeacher()
    const created = await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: 'Pack 5',
      lessons: 5,
      price: 150,
    })

    const response = await client
      .put(`/api/v1/plan-types/${created.body().data.id}`)
      .loginAs(teacher)
      .json({
        label: 'Pacote quinzenal',
        lessons: 6,
        price: 160,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        id: created.body().data.id,
        slug: 'pack_5',
        label: 'Pacote quinzenal',
        lessons: 6,
      },
    })
  })

  test('does not let a teacher edit another teacher type', async ({ client }) => {
    const teacher = await createTeacher({ email: 'teacher@example.com' })
    const other = await createTeacher({ email: 'other@example.com' })
    const created = await client.post('/api/v1/plan-types').loginAs(other).json({
      label: 'Avulsa extra',
      lessons: 1,
      price: 40,
    })

    const response = await client
      .put(`/api/v1/plan-types/${created.body().data.id}`)
      .loginAs(teacher)
      .json({ price: 10 })

    response.assertStatus(404)
  })

  test('deletes an unused plan type', async ({ assert, client }) => {
    const teacher = await createTeacher()
    const created = await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: 'Avulsa extra',
      lessons: 1,
      price: 40,
    })

    const response = await client
      .delete(`/api/v1/plan-types/${created.body().data.id}`)
      .loginAs(teacher)

    response.assertStatus(204)

    const list = await client.get('/api/v1/plan-types').loginAs(teacher)
    assert.lengthOf(list.body().data, 3)
  })

  test('does not delete a plan type that already has sold packages', async ({ client }) => {
    const teacher = await createTeacher()
    const student = await teacher.related('students').create({
      name: 'Ana',
      instrument: 'piano',
    })
    await teacher.related('plans').create({
      studentId: student.id,
      package: 'pack_4',
      lessonsTotal: 4,
      price: 130,
      status: 'paid',
    })
    const types = await client.get('/api/v1/plan-types').loginAs(teacher)
    const pack4 = types.body().data.find((item: { slug: string }) => item.slug === 'pack_4')

    const response = await client.delete(`/api/v1/plan-types/${pack4.id}`).loginAs(teacher)
    response.assertStatus(422)
    response.assertBodyContains({ code: 'E_PLAN_TYPE_IN_USE' })
  })

  test('rejects invalid payloads', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: '',
      lessons: 0,
      price: -1,
    })

    response.assertStatus(422)
  })
})
