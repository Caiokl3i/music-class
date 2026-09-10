import StudentTransformer from '#transformers/student_transformer'
import { assertCanDeleteStudent } from '#services/plan_credits'
import { logSecurityEvent } from '#services/security_log'
import {
  createStudentValidator,
  listStudentsValidator,
  updateStudentValidator,
} from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export default class StudentsController {
  async index({ auth, request, serialize }: HttpContext) {
    const { archived } = await request.validateUsing(listStudentsValidator)
    const query = this.studentsQuery(auth.getUserOrFail())
    if (archived) {
      query.whereNotNull('archivedAt')
    } else {
      query.whereNull('archivedAt')
    }
    const students = await query.orderBy('name', 'asc')
    return serialize(StudentTransformer.transform(students))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createStudentValidator)
    const student = await user.related('students').create({
      ...payload,
      color: payload.color ?? '#0f766e',
    })

    response.status(201)
    return serialize(StudentTransformer.transform(await this.findOwnedStudent(user, student.id)))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const student = await this.findOwnedStudent(auth.getUserOrFail(), params.id)
    return serialize(StudentTransformer.transform(student))
  }

  async update({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const student = await this.findOwnedStudent(user, params.id)
    const payload = await request.validateUsing(updateStudentValidator)

    student.merge(payload)
    await student.save()

    return serialize(StudentTransformer.transform(await this.findOwnedStudent(user, student.id)))
  }

  async destroy({ auth, params, response, logger }: HttpContext) {
    const user = auth.getUserOrFail()
    const student = await this.findOwnedStudent(user, params.id)
    await assertCanDeleteStudent(student)
    const studentId = student.id
    await student.delete()
    logSecurityEvent(logger, 'info', 'student.deleted', { userId: user.id, studentId })

    return response.noContent()
  }

  private studentsQuery(user: User) {
    return user.related('students').query().preload('plans', (plans) => {
      plans
        .whereNot('status', 'cancelled')
        .withCount('lessons', (query) => {
          query.where('status', 'done').as('done_lessons_count')
        })
        .withCount('lessons', (query) => {
          query.whereNot('status', 'cancelled').as('active_lessons_count')
        })
    })
  }

  private findOwnedStudent(user: User, id: number | string) {
    return this.studentsQuery(user).where('id', id).firstOrFail()
  }
}
