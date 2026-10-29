import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { setReadOnlyMode } from '#middleware/read_only_middleware'
import { createTeacher } from '#tests/helpers'

test.group('Read-only maintenance mode', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => {
    setReadOnlyMode(true)
    return () => {
      setReadOnlyMode(null)
    }
  })

  test('allows GET /health and GET /api/v1/students with existing bearer token', async ({
    client,
  }) => {
    const teacher = await createTeacher()
    const token = await User.accessTokens.create(teacher)

    const healthRes = await client.get('/health')
    healthRes.assertStatus(200)
    healthRes.assertBodyContains({ status: 'ok', healthy: true })

    const studentsRes = await client
      .get('/api/v1/students')
      .header('Authorization', `Bearer ${token.value!.release()}`)
    studentsRes.assertStatus(200)
  })

  test('blocks mutating requests (POST, PATCH, PUT, DELETE) with 503 E_MAINTENANCE_READ_ONLY', async ({
    assert,
    client,
  }) => {
    const teacher = await createTeacher()
    const token = await User.accessTokens.create(teacher)
    const bearer = `Bearer ${token.value!.release()}`

    const loginRes = await client.post('/api/v1/auth/login').json({
      email: teacher.email,
      password: 'password123',
    })
    loginRes.assertStatus(503)
    loginRes.assertBodyContains({ code: 'E_MAINTENANCE_READ_ONLY' })
    assert.equal(loginRes.header('retry-after'), '300')

    const createStudentRes = await client
      .post('/api/v1/students')
      .header('Authorization', bearer)
      .json({
        name: 'Aluno Bloqueado',
        instrument: 'Violão',
      })
    createStudentRes.assertStatus(503)
    createStudentRes.assertBodyContains({ code: 'E_MAINTENANCE_READ_ONLY' })

    const patchProfileRes = await client
      .patch('/api/v1/account/profile')
      .header('Authorization', bearer)
      .json({ fullName: 'Novo Nome' })
    patchProfileRes.assertStatus(503)
    patchProfileRes.assertBodyContains({ code: 'E_MAINTENANCE_READ_ONLY' })
  })

  test('resumes normal writes immediately when read-only mode is disabled', async ({ client }) => {
    setReadOnlyMode(false)
    const teacher = await createTeacher()
    const token = await User.accessTokens.create(teacher)

    const res = await client
      .post('/api/v1/students')
      .header('Authorization', `Bearer ${token.value!.release()}`)
      .json({
        name: 'Aluno Liberado',
        instrument: 'Piano',
      })

    res.assertStatus(201)
  })
})
