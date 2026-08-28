import { PACKAGES, PLAN_PACKAGES } from '#services/package_catalog'
import vine from '@vinejs/vine'

export { PACKAGES, PLAN_PACKAGES }
export type { PlanPackage } from '#services/package_catalog'

export const PLAN_STATUSES = ['pending', 'paid', 'cancelled'] as const

export type PlanStatus = (typeof PLAN_STATUSES)[number]

/**
 * Shared fields for plan create/update.
 * `lessonsTotal` and `price` come from PACKAGES in the controller.
 */
const planFields = {
  studentId: vine.number().positive(),
  package: vine.enum(PLAN_PACKAGES),
  status: vine.enum(PLAN_STATUSES).optional(),
  paidAt: vine.date().optional().nullable(),
  notes: vine.string().trim().optional().nullable(),
}

/**
 * Validator used when creating a plan (package purchase).
 * `userId` is set from the authenticated user in the controller.
 */
export const createPlanValidator = vine.create({
  studentId: planFields.studentId,
  package: planFields.package,
  status: planFields.status,
  paidAt: planFields.paidAt,
  notes: planFields.notes,
})

/**
 * Validator used when updating a plan.
 */
export const updatePlanValidator = vine.create({
  studentId: planFields.studentId.clone().optional(),
  package: planFields.package.clone().optional(),
  status: vine.enum(PLAN_STATUSES).optional(),
  paidAt: planFields.paidAt.clone(),
  notes: planFields.notes.clone(),
})
