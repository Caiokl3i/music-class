import LessonTransformer from '#transformers/lesson_transformer'
import {
  createLessonValidator,
  createLessonForStudentValidator,
  updateLessonValidator,
  type LessonStatus,
} from '#validators/lesson'
import {
  createBookedLesson,
  lessonsQuery,
  loadLesson,
  updateBookedLesson,
} from '#services/lesson_booking'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export default class LessonsController {
  async index({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const studentId = request.input('studentId')
    const planId = request.input('planId')
    const query = lessonsQuery(user).orderBy('scheduledAt', 'asc')

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
    const lesson = await createBookedLesson(user, {
      studentId: payload.studentId,
      planId: payload.planId,
      scheduledAt: payload.scheduledAt,
      status: (payload.status ?? 'scheduled') as LessonStatus,
      description: payload.description ?? null,
    })

    response.status(201)
    return serialize(LessonTransformer.transform(lesson))
  }

  async storeForStudent({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.findOwnedStudent(user, params.studentId)
    const payload = await request.validateUsing(createLessonForStudentValidator)
    const lesson = await createBookedLesson(user, {
      studentId: Number(params.studentId),
      planId: payload.planId,
      scheduledAt: payload.scheduledAt,
      status: (payload.status ?? 'scheduled') as LessonStatus,
      description: payload.description ?? null,
    })

    response.status(201)
    return serialize(LessonTransformer.transform(lesson))
  }

  async indexForStudent({ auth, params, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    await this.findOwnedStudent(user, params.studentId)

    const lessons = await lessonsQuery(user)
      .where('studentId', params.studentId)
      .orderBy('scheduledAt', 'asc')

    return serialize(LessonTransformer.transform(lessons))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const lesson = await loadLesson(auth.getUserOrFail(), params.id)
    return serialize(LessonTransformer.transform(lesson))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateLessonValidator)
    const lesson = await updateBookedLesson(user, Number(params.id), {
      studentId: payload.studentId,
      planId: payload.planId,
      scheduledAt: payload.scheduledAt,
      status: payload.status as LessonStatus | undefined,
      description: payload.description,
    })

    return serialize(LessonTransformer.transform(lesson))
  }

  async destroy({ auth, params, response }: HttpContext) {
    const lesson = await loadLesson(auth.getUserOrFail(), params.id)
    await lesson.delete()

    return response.noContent()
  }

  private findOwnedStudent(user: User, id: number | string) {
    return user.related('students').query().where('id', id).firstOrFail()
  }
}
