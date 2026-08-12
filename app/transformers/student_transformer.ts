import type Student from '#models/student'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class StudentTransformer extends BaseTransformer<Student> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'userId',
      'name',
      'birthdate',
      'instrument',
      'phone',
      'description',
      'createdAt',
      'updatedAt',
    ])
  }
}
