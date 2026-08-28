import { createError } from '@adonisjs/core/exceptions'
import LessonTransformer from '#transformers/lesson_transformer'
import {
  createLessonValidator,
  updateLessonValidator,
  type LessonStatus,
} from '#validators/lesson'
import { assertCanConsumeCredit } from '#services/plan_credits'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

const LESSON_STUDENT_MISMATCH = createError(
  'The lesson student must match the plan student',
  'E_LESSON_STUDENT_MISMATCH',
  422
)

export default class LessonsController {
  async index({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const studentId = request.input('studentId')
    const planId = request.input('planId')
    const query = user.related('lessons').query().orderBy('scheduledAt', 'asc')

    if (studentId) {
      query.where('studentId', studentId)
    }

    if (planId) {
      query.where('planId', planId)
    }

    return serialize(LessonTransformer.transform(await query))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createLessonValidator)
    const status: LessonStatus = payload.status ?? 'scheduled'
    const plan = await this.resolvePlan(user, payload.studentId, payload.planId)

    await assertCanConsumeCredit(plan, status)

    const lesson = await user.related('lessons').create({
      studentId: payload.studentId,
      planId: payload.planId,
      scheduledAt: payload.scheduledAt,
      status,
      description: payload.description ?? null,
    })

    response.status(201)
    return serialize(LessonTransformer.transform(lesson))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const lesson = await this.findOwnedLesson(auth.getUserOrFail(), params.id)
    return serialize(LessonTransformer.transform(lesson))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const lesson = await this.findOwnedLesson(user, params.id)
    const payload = await request.validateUsing(updateLessonValidator)
    const studentId = payload.studentId ?? lesson.studentId
    const planId = payload.planId ?? lesson.planId
    const status = (payload.status ?? lesson.status) as LessonStatus
    const plan = await this.resolvePlan(user, studentId, planId)

    await assertCanConsumeCredit(plan, status, lesson.id)

    lesson.studentId = studentId
    lesson.planId = planId
    lesson.status = status

    if (payload.scheduledAt !== undefined) {
      lesson.scheduledAt = payload.scheduledAt
    }

    if (payload.description !== undefined) {
      lesson.description = payload.description
    }

    await lesson.save()
    return serialize(LessonTransformer.transform(lesson))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const lesson = await this.findOwnedLesson(auth.getUserOrFail(), params.id)
    await lesson.delete()

    return response.noContent()
  }

  private findOwnedStudent(user: User, id: number | string) {
    return user.related('students').query().where('id', id).firstOrFail()
  }

  private findOwnedPlan(user: User, id: number | string) {
    return user.related('plans').query().where('id', id).firstOrFail()
  }

  private findOwnedLesson(user: User, id: string) {
    return user.related('lessons').query().where('id', id).firstOrFail()
  }

  private async resolvePlan(user: User, studentId: number | string, planId: number | string) {
    const student = await this.findOwnedStudent(user, studentId)
    const plan = await this.findOwnedPlan(user, planId)

    if (plan.studentId !== student.id) {
      throw new LESSON_STUDENT_MISMATCH()
    }

    return plan
  }
}
