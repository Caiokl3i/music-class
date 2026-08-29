import { DateTime } from 'luxon'
import LessonTransformer from '#transformers/lesson_transformer'
import Plan from '#models/plan'
import {
  remainingCreditsFromCount,
  usableCreditsFromCount,
  planIsExpired,
  lessonsDoneFromExtras,
} from '#services/plan_credits'
import { EXPIRING_SOON_DAYS, LOW_CREDIT_THRESHOLD } from '#services/package_catalog'
import { dashboardQueryValidator } from '#validators/dashboard'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import type Lesson from '#models/lesson'
import type Student from '#models/student'

export default class DashboardController {
  async show({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { timezone } = await request.validateUsing(dashboardQueryValidator)
    const zone = this.resolveZone(timezone)
    const now = DateTime.now().setZone(zone)
    if (!now.isValid) {
      throw new Error('Invalid timezone')
    }
    const startOfDay = now.startOf('day')
    const endOfDay = now.endOf('day')
    const startOfMonth = now.startOf('month')
    const endOfMonth = now.endOf('month')

    const [studentCount, plans, scheduledCount, doneCount, scheduledLessons, recent] =
      await Promise.all([
        this.count(user.related('students').query()),
        user
          .related('plans')
          .query()
          .preload('student')
          .withCount('lessons', (query) => {
            query.where('status', 'done').as('done_lessons_count')
          })
          .withCount('lessons', (query) => {
            query.whereNot('status', 'cancelled').as('active_lessons_count')
          }),
        this.count(user.related('lessons').query().where('status', 'scheduled')),
        this.count(user.related('lessons').query().where('status', 'done')),
        this.lessonList(user).where('status', 'scheduled').orderBy('scheduledAt', 'asc'),
        this.lessonList(user)
          .whereIn('status', ['done', 'no_show'])
          .orderBy('updatedAt', 'desc')
          .limit(5),
      ])

    const paidPlans = plans.filter((plan) => plan.status === 'paid')
    const pendingPlans = plans.filter((plan) => plan.status === 'pending')
    const openPlans = plans.filter((plan) => plan.status !== 'cancelled')
    const activePlans = openPlans.filter((plan) => this.usable(plan) > 0)
    const paidThisMonth = paidPlans.filter((plan) =>
      this.inRange(plan.paidAt, startOfMonth, endOfMonth)
    )

    return serialize({
      studentCount,
      activePlans: activePlans.length,
      scheduledCount,
      doneCount,
      revenue: paidPlans.reduce((sum, plan) => sum + Number(plan.price), 0),
      revenueThisMonth: paidThisMonth.reduce((sum, plan) => sum + Number(plan.price), 0),
      pendingPlans: pendingPlans.length,
      pendingAmount: pendingPlans.reduce((sum, plan) => sum + Number(plan.price), 0),
      lowCredits: this.alerts(
        paidPlans.filter((plan) => {
          const remaining = this.remaining(plan)
          return remaining >= 0 && remaining <= LOW_CREDIT_THRESHOLD
        })
      ),
      expiringSoon: this.alerts(
        paidPlans.filter((plan) => {
          if (this.remaining(plan) <= 0 || !plan.expiresAt || planIsExpired(plan, now)) {
            return false
          }
          return plan.expiresAt <= now.plus({ days: EXPIRING_SOON_DAYS })
        })
      ),
      expiredPlans: this.alerts(
        paidPlans.filter((plan) => this.remaining(plan) > 0 && planIsExpired(plan, now))
      ),
      overdue: LessonTransformer.transform(this.before(scheduledLessons, startOfDay)),
      today: LessonTransformer.transform(this.between(scheduledLessons, startOfDay, endOfDay)),
      upcoming: LessonTransformer.transform(this.after(scheduledLessons, endOfDay).slice(0, 5)),
      recent: LessonTransformer.transform(recent),
    })
  }

  private resolveZone(timezone?: string) {
    const zone = timezone || 'America/Sao_Paulo'
    return DateTime.now().setZone(zone).isValid ? zone : 'America/Sao_Paulo'
  }

  private lessonList(user: User) {
    return user.related('lessons').query().preload('student').preload('plan')
  }

  private remaining(plan: Plan) {
    return remainingCreditsFromCount(plan.lessonsTotal, lessonsDoneFromExtras(plan))
  }

  private usable(plan: Plan) {
    return usableCreditsFromCount(plan, lessonsDoneFromExtras(plan))
  }

  private inRange(value: DateTime | null, start: DateTime, end: DateTime) {
    return Boolean(value && value >= start && value <= end)
  }

  private alerts(plans: Plan[]) {
    return plans.map((plan) => {
      const student = plan.$preloaded.student as Student | undefined
      return {
        planId: plan.id,
        studentId: plan.studentId,
        studentName: student?.name ?? null,
        lessonsRemaining: this.remaining(plan),
        lessonsTotal: plan.lessonsTotal,
        expiresAt: plan.expiresAt,
      }
    })
  }

  private before(lessons: Lesson[], limit: DateTime) {
    return lessons.filter((lesson) => lesson.scheduledAt < limit)
  }

  private between(lessons: Lesson[], start: DateTime, end: DateTime) {
    return lessons.filter((lesson) => lesson.scheduledAt >= start && lesson.scheduledAt <= end)
  }

  private after(lessons: Lesson[], limit: DateTime) {
    return lessons.filter((lesson) => lesson.scheduledAt > limit)
  }

  private async count(query: {
    count: (column: string) => Promise<Array<{ $extras: Record<string, unknown> }>>
  }) {
    const result = await query.count('* as total')
    return Number(result[0]?.$extras.total ?? 0)
  }
}
