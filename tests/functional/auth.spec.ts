import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { createTeacher } from '#tests/helpers'

test.group('Auth', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signs up and returns a token that expires', async ({ assert, client }) => {
    const response = await client.post('/api/v1/auth/signup').json({
      fullName: 'Maria Professora',
      email: 'maria@example.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        user: {
          email: 'maria@example.com',
          fullName: 'Maria Professora',
        },
      },
    })
    assert.isString(response.body().data.token)

    const tokenRow = await db.from('auth_access_tokens').orderBy('id', 'desc').first()
    assert.isNotNull(tokenRow?.expires_at)
  })

  test('rejects signup with duplicate email', async ({ client }) => {
    await createTeacher({ email: 'maria@example.com' })

    const response = await client.post('/api/v1/auth/signup').json({
      email: 'maria@example.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    })

    response.assertStatus(422)
  })

  test('logs in with valid credentials', async ({ assert, client }) => {
    await createTeacher({ email: 'teacher@example.com' })

    const response = await client.post('/api/v1/auth/login').json({
      email: 'teacher@example.com',
      password: 'password123',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        user: { email: 'teacher@example.com' },
      },
    })
    assert.isString(response.body().data.token)

    const tokenRow = await db.from('auth_access_tokens').orderBy('id', 'desc').first()
    assert.isNotNull(tokenRow?.expires_at)
  })

  test('rejects invalid login', async ({ client }) => {
    await createTeacher()

    const response = await client.post('/api/v1/auth/login').json({
      email: 'teacher@example.com',
      password: 'wrong-password',
    })

    response.assertStatus(400)
  })

  test('requires authentication for profile', async ({ client }) => {
    const response = await client.get('/api/v1/account/profile')
    response.assertStatus(401)
  })

  test('shows and updates the profile name', async ({ client }) => {
    const teacher = await createTeacher({ fullName: 'Old Name' })

    const show = await client.get('/api/v1/account/profile').loginAs(teacher)
    show.assertStatus(200)
    show.assertBodyContains({
      data: { email: 'teacher@example.com', fullName: 'Old Name' },
    })

    const update = await client.patch('/api/v1/account/profile').loginAs(teacher).json({
      fullName: 'New Name',
    })
    update.assertStatus(200)
    update.assertBodyContains({
      data: { fullName: 'New Name' },
    })
  })

  test('updates password when the current one matches', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.put('/api/v1/account/password').loginAs(teacher).json({
      currentPassword: 'password123',
      password: 'newpassword1',
      passwordConfirmation: 'newpassword1',
    })

    response.assertStatus(200)

    const login = await client.post('/api/v1/auth/login').json({
      email: 'teacher@example.com',
      password: 'newpassword1',
    })
    login.assertStatus(200)
  })

  test('rejects password update with wrong current password', async ({ client }) => {
    const teacher = await createTeacher()

    const response = await client.put('/api/v1/account/password').loginAs(teacher).json({
      currentPassword: 'nope-nope',
      password: 'newpassword1',
      passwordConfirmation: 'newpassword1',
    })

    response.assertStatus(400)
  })

  test('logs out the current token', async ({ client }) => {
    const signup = await client.post('/api/v1/auth/signup').json({
      email: 'logout@example.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
    signup.assertStatus(200)
    const token = signup.body().data.token

    const logout = await client
      .post('/api/v1/account/logout')
      .header('Authorization', `Bearer ${token}`)
    logout.assertStatus(200)

    const profile = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${token}`)
    profile.assertStatus(401)
  })
})
