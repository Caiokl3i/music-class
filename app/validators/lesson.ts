import vine from '@vinejs/vine'

export const LESSON_STATUSES = ['scheduled', 'done', 'cancelled', 'no_show'] as const

export type LessonStatus = (typeof LESSON_STATUSES)[number]

/**
 * Shared fields for lesson create/update.
 */
const lessonFields = {
  studentId: vine.number().positive(),
  planId: vine.number().positive(),
  scheduledAt: vine.date({ formats: ['iso8601'] }),
  endsAt: vine.date({ formats: ['iso8601'] }).optional().nullable(),
  status: vine.enum(LESSON_STATUSES),
  description: vine.string().trim().optional().nullable(),
}

/**
 * Validator used when creating a lesson.
 * `userId` is set from the authenticated user in the controller.
 * `status` defaults to `scheduled` when omitted.
 */
export const createLessonValidator = vine.create({
  studentId: lessonFields.studentId,
  planId: lessonFields.planId,
  scheduledAt: lessonFields.scheduledAt,
  endsAt: lessonFields.endsAt,
  status: lessonFields.status.clone().optional(),
  description: lessonFields.description,
})

/**
 * Validator used when creating a lesson for a specific student (studentId from URL).
 */
export const createLessonForStudentValidator = vine.create({
  planId: lessonFields.planId,
  scheduledAt: lessonFields.scheduledAt,
  endsAt: lessonFields.endsAt,
  status: lessonFields.status.clone().optional(),
  description: lessonFields.description,
})

/**
 * Validator used when updating a lesson.
 */
export const updateLessonValidator = vine.create({
  studentId: lessonFields.studentId.clone().optional(),
  planId: lessonFields.planId.clone().optional(),
  scheduledAt: lessonFields.scheduledAt.clone().optional(),
  endsAt: lessonFields.endsAt.clone(),
  status: lessonFields.status.clone().optional(),
  description: lessonFields.description.clone(),
})
