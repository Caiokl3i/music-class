import { DateTime } from 'luxon'
import LessonTransformer from '#transformers/lesson_transformer'
import Plan from '#models/plan'
import { remainingCreditsFromCount } from '#services/plan_credits'
import { dashboardQueryValidator } from '#validators/dashboard'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'
import type Lesson from '#models/lesson'

export default class DashboardController {
  async show({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { timezone } = await request.validateUsing(dashboardQueryValidator)
    const zone = this.resolveZone(timezone)
    const now = DateTime.now().setZone(zone)
    const startOfDay = now.startOf('day')
    const endOfDay = now.endOf('day')

    const [studentCount, plans, scheduledCount, doneCount, scheduledLessons, recent] =
      await Promise.all([
        this.count(user.related('students').query()),
        user.related('plans').query().withCount('lessons', (query) => {
          query.whereNot('status', 'cancelled')
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
    const activePlans = paidPlans.filter((plan) => this.remaining(plan) > 0)

    return serialize({
      studentCount,
      activePlans: activePlans.length,
      scheduledCount,
      doneCount,
      revenue: paidPlans.reduce((sum, plan) => sum + Number(plan.price), 0),
      pendingPlans: pendingPlans.length,
      pendingAmount: pendingPlans.reduce((sum, plan) => sum + Number(plan.price), 0),
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
    return remainingCreditsFromCount(plan.lessonsTotal, Number(plan.$extras.lessons_count ?? 0))
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
