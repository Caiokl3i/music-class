import { createError } from '@adonisjs/core/exceptions'
import db from '@adonisjs/lucid/services/db'
import Lesson from '#models/lesson'
import { assertCanConsumeCredit, lessonOccupiesSlot } from '#services/plan_credits'
import { assertSlotFree, resolveLessonWindow } from '#services/lesson_schedule'
import type User from '#models/user'
import type { DateTime } from 'luxon'
import type { LessonStatus } from '#validators/lesson'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export const LESSON_STUDENT_MISMATCH = createError(
  'The lesson student must match the plan student',
  'E_LESSON_STUDENT_MISMATCH',
  422
)

export const LESSON_REPOSITION_REQUIRES_NO_SHOW = createError(
  'Only a no_show lesson can be repositioned',
  'E_LESSON_REPOSITION_REQUIRES_NO_SHOW',
  422
)

type LessonPayload = {
  studentId: number
  planId: number
  scheduledAt: DateTime
  endsAt?: DateTime | null
  status: LessonStatus
  description: string | null
}

export async function createBookedLesson(user: User, payload: LessonPayload) {
  const lessonId = await db.transaction(async (trx) => {
    const { student, plan } = await loadOwnedStudentAndPlan(
      user,
      payload.studentId,
      payload.planId,
      trx
    )

    plan.useTransaction(trx)
    await assertCanConsumeCredit(plan, payload.status)
    const window = resolveLessonWindow(payload.scheduledAt, payload.endsAt)
    await assertOccupancy(user, window.scheduledAt, window.endsAt, payload.status, trx)

    const lesson = await Lesson.create(
      {
        userId: user.id,
        studentId: student.id,
        planId: plan.id,
        scheduledAt: window.scheduledAt,
        endsAt: window.endsAt,
        status: payload.status,
        description: payload.description,
      },
      { client: trx }
    )

    return lesson.id
  })

  return loadLesson(user, lessonId)
}

export async function updateBookedLesson(
  user: User,
  lessonId: number,
  payload: Partial<LessonPayload>
) {
  await db.transaction(async (trx) => {
    const lesson = await Lesson.query({ client: trx })
      .where('id', lessonId)
      .where('userId', user.id)
      .firstOrFail()

    const studentId = payload.studentId ?? lesson.studentId
    const planId = payload.planId ?? lesson.planId
    const status = (payload.status ?? lesson.status) as LessonStatus
    const previousStatus = lesson.status
    const window = resolveLessonWindow(
      payload.scheduledAt ?? lesson.scheduledAt,
      payload.endsAt,
      { scheduledAt: lesson.scheduledAt, endsAt: lesson.endsAt }
    )

    const { plan } = await loadOwnedStudentAndPlan(user, studentId, planId, trx)
    plan.useTransaction(trx)
    await assertCanConsumeCredit(plan, status, lesson.id, previousStatus)
    await assertOccupancy(user, window.scheduledAt, window.endsAt, status, trx, lesson.id)

    lesson.useTransaction(trx)
    lesson.studentId = studentId
    lesson.planId = planId
    lesson.status = status
    lesson.scheduledAt = window.scheduledAt
    lesson.endsAt = window.endsAt

    if (payload.description !== undefined) {
      lesson.description = payload.description
    }

    await lesson.save()
  })

  return loadLesson(user, lessonId)
}

type RepositionLessonPayload = {
  scheduledAt: DateTime
  endsAt?: DateTime | null
  description: string | null
}

export async function repositionBookedLesson(
  user: User,
  lessonId: number,
  payload: RepositionLessonPayload
) {
  const newLessonId = await db.transaction(async (trx) => {
    const lesson = await Lesson.query({ client: trx })
      .where('id', lessonId)
      .where('userId', user.id)
      .firstOrFail()

    if (lesson.status !== 'no_show') {
      throw new LESSON_REPOSITION_REQUIRES_NO_SHOW()
    }

    // Return credit from the existing `no_show`.
    lesson.useTransaction(trx)
    lesson.status = 'cancelled'
    await lesson.save()

    const { student, plan } = await loadOwnedStudentAndPlan(
      user,
      lesson.studentId,
      lesson.planId,
      trx
    )

    plan.useTransaction(trx)
    await assertCanConsumeCredit(plan, 'scheduled')

    const window = resolveLessonWindow(payload.scheduledAt, payload.endsAt)
    await assertOccupancy(user, window.scheduledAt, window.endsAt, 'scheduled', trx)

    const replacement = await Lesson.create(
      {
        userId: user.id,
        studentId: student.id,
        planId: plan.id,
        scheduledAt: window.scheduledAt,
        endsAt: window.endsAt,
        status: 'scheduled',
        description: payload.description,
      },
      { client: trx }
    )

    return replacement.id
  })

  return loadLesson(user, newLessonId)
}

export function lessonsQuery(user: User) {
  return user.related('lessons').query().preload('student').preload('plan')
}

export function loadLesson(user: User, id: number | string) {
  return lessonsQuery(user).where('id', id).firstOrFail()
}

async function assertOccupancy(
  user: User,
  scheduledAt: DateTime,
  endsAt: DateTime,
  status: string,
  trx: TransactionClientContract,
  exceptLessonId?: number
) {
  if (!lessonOccupiesSlot(status)) {
    return
  }

  await assertSlotFree(user, scheduledAt, { endsAt, exceptLessonId, trx })
}

async function loadOwnedStudentAndPlan(
  user: User,
  studentId: number | string,
  planId: number | string,
  trx: TransactionClientContract
) {
  const student = await user
    .related('students')
    .query()
    .useTransaction(trx)
    .where('id', studentId)
    .firstOrFail()

  const plan = await user
    .related('plans')
    .query()
    .useTransaction(trx)
    .where('id', planId)
    .firstOrFail()

  if (plan.studentId !== student.id) {
    throw new LESSON_STUDENT_MISMATCH()
  }

  return { student, plan }
}
