import { DateTime } from 'luxon'
import { createError } from '@adonisjs/core/exceptions'
import { CREDIT_VALIDITY_DAYS } from '#services/package_catalog'
import type Plan from '#models/plan'

export const PLAN_NO_CREDITS = createError(
  'This plan has no remaining lesson credits',
  'E_PLAN_NO_CREDITS',
  422
)

export const PLAN_CANCELLED = createError(
  'Cannot consume lesson credits on a cancelled plan',
  'E_PLAN_CANCELLED',
  422
)

export const PLAN_NOT_PAID = createError(
  'Cannot consume lesson credits on a plan that is not paid',
  'E_PLAN_NOT_PAID',
  422
)

export const PLAN_EXPIRED = createError(
  'This plan has expired and cannot consume new lesson credits',
  'E_PLAN_EXPIRED',
  422
)

export const PLAN_LESSONS_TOTAL_TOO_LOW = createError(
  'Plan lessons total cannot be lower than active lessons',
  'E_PLAN_LESSONS_TOTAL_TOO_LOW',
  422
)

/**
 * Active lessons are those whose status is not `cancelled`.
 * `scheduled`, `done` and `no_show` all consume one credit.
 */
export function lessonConsumesCredit(status: string) {
  return status !== 'cancelled'
}

export function isNewCreditConsumption(status: string, previousStatus?: string) {
  return lessonConsumesCredit(status) && !lessonConsumesCredit(previousStatus ?? 'cancelled')
}

export function planIsExpired(plan: { expiresAt?: DateTime | null }, at = DateTime.now()) {
  return Boolean(plan.expiresAt && plan.expiresAt <= at)
}

export function expiresAtFromPaidAt(
  status: string,
  paidAt: DateTime | null,
  previousExpiresAt?: DateTime | null,
  previousStatus?: string
) {
  if (status === 'pending' || !paidAt) {
    return null
  }

  if (status === 'cancelled') {
    return previousExpiresAt ?? null
  }

  if (previousExpiresAt) {
    return previousExpiresAt
  }

  if (previousStatus === 'paid') {
    return null
  }

  return paidAt.plus({ days: CREDIT_VALIDITY_DAYS })
}

export function creditBlockReason(planStatus: string, lessonStatus: string) {
  if (!lessonConsumesCredit(lessonStatus)) {
    return null
  }

  if (planStatus === 'cancelled') {
    return 'cancelled' as const
  }

  if (planStatus !== 'paid') {
    return 'not_paid' as const
  }

  return null
}

export async function countActiveLessons(plan: Plan, exceptLessonId?: number) {
  const query = plan.related('lessons').query().whereNot('status', 'cancelled')

  if (exceptLessonId !== undefined) {
    query.whereNot('id', exceptLessonId)
  }

  const result = await query.count('* as total')
  return Number(result[0]?.$extras.total ?? 0)
}

export async function remainingCredits(plan: Plan, exceptLessonId?: number) {
  const consumed = await countActiveLessons(plan, exceptLessonId)
  return plan.lessonsTotal - consumed
}

export function remainingCreditsFromCount(lessonsTotal: number, activeLessons: number) {
  return lessonsTotal - activeLessons
}

export function usableCreditsFromCount(
  plan: { status: string; expiresAt?: DateTime | null; lessonsTotal: number },
  activeLessons: number
) {
  if (plan.status !== 'paid' || planIsExpired(plan)) {
    return 0
  }

  return remainingCreditsFromCount(plan.lessonsTotal, activeLessons)
}

export async function assertCanConsumeCredit(
  plan: Plan,
  status: string,
  exceptLessonId?: number,
  previousStatus?: string
) {
  const blocked = creditBlockReason(plan.status, status)

  if (blocked === 'cancelled') {
    throw new PLAN_CANCELLED()
  }

  if (blocked === 'not_paid') {
    throw new PLAN_NOT_PAID()
  }

  if (!lessonConsumesCredit(status)) {
    return
  }

  if (isNewCreditConsumption(status, previousStatus) && planIsExpired(plan)) {
    throw new PLAN_EXPIRED()
  }

  if ((await remainingCredits(plan, exceptLessonId)) <= 0) {
    throw new PLAN_NO_CREDITS()
  }
}

export async function assertLessonsTotalNotBelowActive(plan: Plan, lessonsTotal: number) {
  const activeLessons = await countActiveLessons(plan)

  if (lessonsTotal < activeLessons) {
    throw new PLAN_LESSONS_TOTAL_TOO_LOW()
  }
}
