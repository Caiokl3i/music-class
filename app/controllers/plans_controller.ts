import { DateTime } from 'luxon'
import PlanTransformer from '#transformers/plan_transformer'
import {
  createPlanValidator,
  updatePlanValidator,
  generatePlanLessonsValidator,
  type PlanStatus,
} from '#validators/plan'
import { billingQueryValidator } from '#validators/plan_discount'
import { resolvePlanType } from '#services/plan_types'
import { assertLessonsTotalNotBelowActive, expiresAtFromPaidAt } from '#services/plan_credits'
import { generatePlanLessons } from '#services/lesson_generate'
import {
  billingFilename,
  buildBillingPdf,
  buildBillingSummary,
} from '#services/billing_message'
import LessonTransformer from '#transformers/lesson_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export default class PlansController {
  async index({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const studentId = request.input('studentId')
    const query = this.plansQuery(user).orderBy('createdAt', 'desc')

    if (studentId) {
      query.where('studentId', studentId)
    }

    return serialize(PlanTransformer.transform(await query))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createPlanValidator)
    const student = await this.findOwnedStudent(user, payload.studentId)
    const catalog = await resolvePlanType(user, payload.package)
    const status: PlanStatus = payload.status ?? 'pending'
    const paidAt = this.resolvePaidAt(status, payload.paidAt)

    const plan = await user.related('plans').create({
      studentId: student.id,
      package: payload.package,
      lessonsTotal: catalog.lessons,
      price: catalog.price,
      status,
      paidAt,
      expiresAt: expiresAtFromPaidAt(status, paidAt),
      notes: payload.notes ?? null,
    })

    response.status(201)
    return serialize(PlanTransformer.transform(await this.findOwnedPlan(user, plan.id)))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const plan = await this.findOwnedPlan(auth.getUserOrFail(), params.id)
    return serialize(PlanTransformer.transform(plan))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const plan = await this.findOwnedPlan(user, params.id)
    const previousStatus = plan.status
    const previousExpiresAt = plan.expiresAt
    const payload = await request.validateUsing(updatePlanValidator)

    if (payload.studentId !== undefined) {
      await this.findOwnedStudent(user, payload.studentId)
      plan.studentId = payload.studentId
    }

    if (payload.package) {
      const catalog = await resolvePlanType(user, payload.package)
      await assertLessonsTotalNotBelowActive(plan, catalog.lessons)
      plan.package = payload.package
      plan.lessonsTotal = catalog.lessons
      plan.price = catalog.price
    }

    if (payload.status !== undefined) {
      plan.status = payload.status
    }

    if (payload.status !== undefined || payload.paidAt !== undefined) {
      const nextStatus = (payload.status ?? plan.status) as PlanStatus
      plan.paidAt = this.resolvePaidAt(nextStatus, payload.paidAt, plan.paidAt)
      plan.expiresAt = expiresAtFromPaidAt(
        nextStatus,
        plan.paidAt,
        previousExpiresAt,
        previousStatus
      )
    }

    if (payload.notes !== undefined) {
      plan.notes = payload.notes
    }

    await plan.save()
    return serialize(PlanTransformer.transform(await this.findOwnedPlan(user, plan.id)))
  }

  async generateLessons({ auth, params, request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(generatePlanLessonsValidator)
    const lessons = await generatePlanLessons(
      auth.getUserOrFail(),
      Number(params.id),
      payload.firstScheduledAt
    )

    response.status(201)
    return serialize(LessonTransformer.transform(lessons))
  }

  async billing({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(billingQueryValidator)
    const summary = await this.buildOwnedBilling(user, params.id, payload)
    return serialize(summary)
  }

  async billingPdf({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(billingQueryValidator)
    const summary = await this.buildOwnedBilling(user, params.id, payload)
    const pdf = await buildBillingPdf(summary)

    return response
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${billingFilename(summary)}"`)
      .header('Cache-Control', 'no-store')
      .send(pdf)
  }

  async destroy({ auth, params, response }: HttpContext) {
    const plan = await this.findOwnedPlan(auth.getUserOrFail(), params.id)
    await plan.delete()

    return response.noContent()
  }

  private findOwnedStudent(user: User, id: number | string) {
    return user.related('students').query().where('id', id).firstOrFail()
  }

  private plansQuery(user: User) {
    return user
      .related('plans')
      .query()
      .preload('discounts', (query) => query.orderBy('serviceAt', 'asc').orderBy('id', 'asc'))
      .withCount('lessons', (query) => {
        query.where('status', 'done').as('done_lessons_count')
      })
      .withCount('lessons', (query) => {
        query.whereNot('status', 'cancelled').as('active_lessons_count')
      })
  }

  private findOwnedPlan(user: User, id: number | string) {
    return this.plansQuery(user).where('id', id).firstOrFail()
  }

  private async buildOwnedBilling(
    user: User,
    planId: number | string,
    payload: { month?: string; timezone?: string }
  ) {
    const plan = await this.plansQuery(user)
      .where('id', planId)
      .preload('student')
      .preload('lessons')
      .firstOrFail()

    return buildBillingSummary({
      plan,
      lessons: plan.lessons,
      discounts: plan.discounts,
      month: payload.month,
      timezone: payload.timezone,
      studentName: plan.student?.name ?? null,
    })
  }

  private resolvePaidAt(
    status: PlanStatus,
    paidAt?: DateTime | null,
    previousPaidAt?: DateTime | null
  ) {
    if (status === 'paid') {
      return paidAt ?? previousPaidAt ?? DateTime.now()
    }

    if (status === 'cancelled') {
      return paidAt ?? previousPaidAt ?? null
    }

    return null
  }
}
