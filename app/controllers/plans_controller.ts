import { DateTime } from 'luxon'
import PlanTransformer from '#transformers/plan_transformer'
import {
  PACKAGES,
  createPlanValidator,
  updatePlanValidator,
  type PlanStatus,
} from '#validators/plan'
import { assertLessonsTotalNotBelowActive } from '#services/plan_credits'
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
    const catalog = PACKAGES[payload.package]
    const status: PlanStatus = payload.status ?? 'pending'

    const plan = await user.related('plans').create({
      studentId: student.id,
      package: payload.package,
      lessonsTotal: catalog.lessons,
      price: catalog.price,
      status,
      paidAt: this.resolvePaidAt(status, payload.paidAt),
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
    const payload = await request.validateUsing(updatePlanValidator)

    if (payload.studentId !== undefined) {
      await this.findOwnedStudent(user, payload.studentId)
      plan.studentId = payload.studentId
    }

    if (payload.package) {
      const catalog = PACKAGES[payload.package]
      await assertLessonsTotalNotBelowActive(plan, catalog.lessons)
      plan.package = payload.package
      plan.lessonsTotal = catalog.lessons
      plan.price = catalog.price
    }

    if (payload.status !== undefined) {
      plan.status = payload.status
    }

    if (payload.status !== undefined || payload.paidAt !== undefined) {
      plan.paidAt = this.resolvePaidAt(
        (payload.status ?? plan.status) as PlanStatus,
        payload.paidAt,
        plan.paidAt
      )
    }

    if (payload.notes !== undefined) {
      plan.notes = payload.notes
    }

    await plan.save()
    return serialize(PlanTransformer.transform(await this.findOwnedPlan(user, plan.id)))
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
    return user.related('plans').query().withCount('lessons', (query) => {
      query.whereNot('status', 'cancelled')
    })
  }

  private findOwnedPlan(user: User, id: number | string) {
    return this.plansQuery(user).where('id', id).firstOrFail()
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
