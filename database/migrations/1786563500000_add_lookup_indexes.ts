import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('students', (table) => {
      table.index(['user_id'], 'students_user_id_index')
    })

    this.schema.alterTable('plans', (table) => {
      table.index(['user_id'], 'plans_user_id_index')
      table.index(['student_id'], 'plans_student_id_index')
    })

    this.schema.alterTable('lessons', (table) => {
      table.index(['user_id'], 'lessons_user_id_index')
      table.index(['student_id'], 'lessons_student_id_index')
      table.index(['plan_id'], 'lessons_plan_id_index')
      table.index(['scheduled_at'], 'lessons_scheduled_at_index')
    })
  }

  async down() {
    this.schema.alterTable('students', (table) => {
      table.dropIndex(['user_id'], 'students_user_id_index')
    })

    this.schema.alterTable('plans', (table) => {
      table.dropIndex(['user_id'], 'plans_user_id_index')
      table.dropIndex(['student_id'], 'plans_student_id_index')
    })

    this.schema.alterTable('lessons', (table) => {
      table.dropIndex(['user_id'], 'lessons_user_id_index')
      table.dropIndex(['student_id'], 'lessons_student_id_index')
      table.dropIndex(['plan_id'], 'lessons_plan_id_index')
      table.dropIndex(['scheduled_at'], 'lessons_scheduled_at_index')
    })
  }
}
