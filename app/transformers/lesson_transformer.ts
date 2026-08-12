import type Lesson from '#models/lesson'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class LessonTransformer extends BaseTransformer<Lesson> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'userId',
      'studentId',
      'planId',
      'scheduledAt',
      'status',
      'description',
      'createdAt',
      'updatedAt',
    ])
  }
}
