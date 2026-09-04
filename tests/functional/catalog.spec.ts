import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createTeacher } from '#tests/helpers'

test.group('Catalog', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/packages')
    response.assertStatus(401)
  })

  test('lists the package catalog with prices and labels', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.get('/api/v1/packages').loginAs(teacher)
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        packages: [
          { value: 'single', lessons: 1, price: 35, label: 'Aula avulsa' },
          { value: 'pack_4', lessons: 4, price: 130, label: 'Pacote mensal 1' },
          { value: 'pack_8', lessons: 8, price: 240, label: 'Pacote mensal 2' },
        ],
        lessonDurationMinutes: 60,
        creditValidityDays: 60,
        lowCreditThreshold: 1,
      },
    })
  })

  test('includes custom plan types in the catalog', async ({ client }) => {
    const teacher = await createTeacher()
    await client.post('/api/v1/plan-types').loginAs(teacher).json({
      label: 'Aula experimental',
      lessons: 1,
      price: 20,
    })

    const response = await client.get('/api/v1/packages').loginAs(teacher)
    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        packages: [{ value: 'aula_experimental', lessons: 1, price: 20, label: 'Aula experimental' }],
      },
    })
  })
})
