import db from '@adonisjs/lucid/services/db'
import Lesson from '#models/lesson'
import {
  PLAN_NO_CREDITS,
  PLAN_EXPIRED,
  remainingCredits,
  assertCanConsumeCredit,
} from '#services/plan_credits'
import { assertSlotFree, loadOccupiedLessons, weeklySlots } from '#services/lesson_schedule'
import { lessonsQuery } from '#services/lesson_booking'
import type User from '#models/user'
import type { DateTime } from 'luxon'

export async function generatePlanLessons(user: User, planId: number, firstScheduledAt: DateTime) {
  const ids = await db.transaction(async (trx) => {
    const plan = await user
      .related('plans')
      .query()
      .useTransaction(trx)
      .where('id', planId)
      .firstOrFail()

    plan.useTransaction(trx)
    await assertCanConsumeCredit(plan, 'scheduled')

    const remaining = await remainingCredits(plan)
    if (remaining <= 0) {
      throw new PLAN_NO_CREDITS()
    }

    const slots = weeklySlots(firstScheduledAt, remaining, plan.expiresAt)
    if (slots.length === 0) {
      throw new PLAN_EXPIRED()
    }

    const occupied = await loadOccupiedLessons(user, trx)
    for (const slot of slots) {
      await assertSlotFree(user, slot, { occupied, trx })
    }

    const created = await Lesson.createMany(
      slots.map((scheduledAt) => ({
        userId: user.id,
        studentId: plan.studentId,
        planId: plan.id,
        scheduledAt,
        status: 'scheduled' as const,
        description: null,
      })),
      { client: trx }
    )

    return created.map((lesson) => lesson.id)
  })

  return lessonsQuery(user).whereIn('id', ids).orderBy('scheduledAt', 'asc')
}
