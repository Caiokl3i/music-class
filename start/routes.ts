import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('profile', [controllers.Profile, 'update'])
        router.put('password', [controllers.Profile, 'updatePassword'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('dashboard', [controllers.Dashboard, 'show'])
        router.get('export', [controllers.Dashboard, 'exportMonth'])
        router.get('packages', [controllers.Catalog, 'packages'])
        router.get('students/:studentId/lessons', [controllers.Lessons, 'indexForStudent'])
        router.post('students/:studentId/lessons', [controllers.Lessons, 'storeForStudent'])
        router.resource('students', controllers.Students).apiOnly()
        router.post('plans/:id/lessons/generate', [controllers.Plans, 'generateLessons'])
        router.resource('plans', controllers.Plans).apiOnly()
        router.resource('lessons', controllers.Lessons).apiOnly()
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
