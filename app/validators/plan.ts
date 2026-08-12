import vine from '@vinejs/vine'

export const PLAN_PACKAGES = ['single', 'pack_4', 'pack_8'] as const
export const PLAN_STATUSES = ['pending', 'paid', 'cancelled'] as const

/**
 * Shared fields for plan create/update.
 */
const planFields = {
  studentId: vine.number().positive(),
  package: vine.enum(PLAN_PACKAGES),
  lessonsTotal: vine.number().positive(),
  price: vine.number().min(0),
  status: vine.enum(PLAN_STATUSES),
  paidAt: vine.date().optional().nullable(),
  notes: vine.string().trim().optional().nullable(),
}

/**
 * Validator used when creating a plan (package purchase).
 * `userId` is set from the authenticated user in the controller.
 */
export const createPlanValidator = vine.create(planFields)

/**
 * Validator used when updating a plan.
 */
export const updatePlanValidator = vine.create({
  studentId: planFields.studentId.clone().optional(),
  package: planFields.package.clone().optional(),
  lessonsTotal: planFields.lessonsTotal.clone().optional(),
  price: planFields.price.clone().optional(),
  status: planFields.status.clone().optional(),
  paidAt: planFields.paidAt.clone(),
  notes: planFields.notes.clone(),
})
