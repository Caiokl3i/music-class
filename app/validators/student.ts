import vine from '@vinejs/vine'

/**
 * Shared fields for student create/update.
 */
const studentFields = {
  name: vine.string().trim().minLength(1).maxLength(255),
  birthdate: vine.date().optional().nullable(),
  instrument: vine.string().trim().minLength(1).maxLength(255),
  phone: vine.string().trim().maxLength(30).optional().nullable(),
  description: vine.string().trim().optional().nullable(),
  preferredWeekday: vine.number().withoutDecimals().min(1).max(7).optional().nullable(),
  preferredTime: vine.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
}

/**
 * Validator used when creating a student.
 * `userId` is set from the authenticated user in the controller.
 */
export const createStudentValidator = vine.create(studentFields)

/**
 * Validator used when updating a student.
 */
export const updateStudentValidator = vine.create({
  name: studentFields.name.clone().optional(),
  birthdate: studentFields.birthdate.clone(),
  instrument: studentFields.instrument.clone().optional(),
  phone: studentFields.phone.clone(),
  description: studentFields.description.clone(),
  preferredWeekday: studentFields.preferredWeekday.clone(),
  preferredTime: studentFields.preferredTime.clone(),
})
