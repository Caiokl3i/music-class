import StudentTransformer from '#transformers/student_transformer'
import { createStudentValidator, updateStudentValidator } from '#validators/student'
import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export default class StudentsController {
  async index({ auth, serialize }: HttpContext) {
    const students = await this.studentsQuery(auth.getUserOrFail()).orderBy('name', 'asc')
    return serialize(StudentTransformer.transform(students))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createStudentValidator)
    const student = await user.related('students').create(payload)

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

  async destroy({ auth, params, response }: HttpContext) {
    const student = await this.findOwnedStudent(auth.getUserOrFail(), params.id)
    await student.delete()

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
