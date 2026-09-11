import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { RATE_LIMITS } from '#services/rate_limit'

router.get('/', () => {
  return { ok: true }
})

router
  .group(() => {
    router
      .group(() => {
        router
          .post('signup', [controllers.NewAccount, 'store'])
          .use(middleware.throttle(RATE_LIMITS.signup))
        router
          .post('login', [controllers.AccessTokens, 'store'])
          .use(middleware.throttle(RATE_LIMITS.login))
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('profile', [controllers.Profile, 'update'])
        router
          .put('password', [controllers.Profile, 'updatePassword'])
          .use(middleware.throttle(RATE_LIMITS.password))
        router
          .post('backup-email', [controllers.Profile, 'emailBackup'])
          .use(middleware.throttle(RATE_LIMITS.backupEmail))
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use([middleware.auth(), middleware.throttle(RATE_LIMITS.api)])

    router
      .group(() => {
        router.get('dashboard', [controllers.Dashboard, 'show'])
        router
          .get('export', [controllers.Dashboard, 'exportMonth'])
          .use(middleware.throttle(RATE_LIMITS.export))
        router
          .get('export.pdf', [controllers.Dashboard, 'exportMonthPdf'])
          .use(middleware.throttle(RATE_LIMITS.export))
        router.get('packages', [controllers.Catalog, 'packages'])
        router.get('students/:studentId/lessons', [controllers.Lessons, 'indexForStudent'])
        router.post('students/:studentId/lessons', [controllers.Lessons, 'storeForStudent'])
        router.resource('students', controllers.Students).apiOnly()
        router.resource('plan-types', controllers.PlanTypes).apiOnly()
        router
          .post('plans/:id/lessons/generate', [controllers.Plans, 'generateLessons'])
          .use(middleware.throttle(RATE_LIMITS.generate))
        router.get('plans/:id/billing', [controllers.Plans, 'billing'])
        router
          .get('plans/:id/billing.pdf', [controllers.Plans, 'billingPdf'])
          .use(middleware.throttle(RATE_LIMITS.export))
        router.post('plans/:planId/discounts', [controllers.PlanDiscounts, 'store'])
        router.patch('plans/:planId/discounts/:id', [controllers.PlanDiscounts, 'update'])
        router.delete('plans/:planId/discounts/:id', [controllers.PlanDiscounts, 'destroy'])
        router.resource('plans', controllers.Plans).apiOnly()
        router.post('lessons/:id/reposition', [controllers.Lessons, 'reposition'])
        router.resource('lessons', controllers.Lessons).apiOnly()
      })
      .use([middleware.auth(), middleware.throttle(RATE_LIMITS.api)])
  })
  .prefix('/api/v1')
