import type Lesson from '#models/lesson'
import type Student from '#models/student'
import type Plan from '#models/plan'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class LessonTransformer extends BaseTransformer<Lesson> {
  toObject() {
    const student = this.resource.$preloaded.student as Student | undefined
    const plan = this.resource.$preloaded.plan as Plan | undefined

    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'studentId',
        'planId',
        'scheduledAt',
        'status',
        'description',
        'createdAt',
        'updatedAt',
      ]),
      studentName: student?.name ?? null,
      studentInstrument: student?.instrument ?? null,
      planPackage: (plan?.package as Plan['package'] | undefined) ?? null,
    }
  }
}
