import { createError } from '@adonisjs/core/exceptions'
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

export async function assertCanConsumeCredit(
  plan: Plan,
  status: string,
  exceptLessonId?: number
) {
  if (!lessonConsumesCredit(status)) {
    return
  }

  if (plan.status === 'cancelled') {
    throw new PLAN_CANCELLED()
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
