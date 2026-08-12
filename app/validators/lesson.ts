import vine from '@vinejs/vine'

export const LESSON_STATUSES = ['scheduled', 'done', 'cancelled', 'no_show'] as const

/**
 * Shared fields for lesson create/update.
 */
const lessonFields = {
  studentId: vine.number().positive(),
  planId: vine.number().positive(),
  scheduledAt: vine.date(),
  status: vine.enum(LESSON_STATUSES),
  description: vine.string().trim().optional().nullable(),
}

/**
 * Validator used when creating a lesson.
 * `userId` is set from the authenticated user in the controller.
 */
export const createLessonValidator = vine.create(lessonFields)

/**
 * Validator used when updating a lesson.
 */
export const updateLessonValidator = vine.create({
  studentId: lessonFields.studentId.clone().optional(),
  planId: lessonFields.planId.clone().optional(),
  scheduledAt: lessonFields.scheduledAt.clone().optional(),
  status: lessonFields.status.clone().optional(),
  description: lessonFields.description.clone(),
})
