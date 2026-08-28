import { DateTime } from 'luxon'
import { createError } from '@adonisjs/core/exceptions'
import Lesson from '#models/lesson'
import { LESSON_DURATION_MINUTES } from '#services/package_catalog'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export const LESSON_SCHEDULE_CONFLICT = createError(
  'This time overlaps another scheduled lesson',
  'E_LESSON_SCHEDULE_CONFLICT',
  422
)

export function lessonEnd(start: DateTime) {
  return start.plus({ minutes: LESSON_DURATION_MINUTES })
}

/** Same-duration lessons overlap unless they are back-to-back. */
export function windowsOverlap(aStart: DateTime, bStart: DateTime) {
  return aStart < lessonEnd(bStart) && bStart < lessonEnd(aStart)
}

export function weeklySlots(first: DateTime, count: number, until?: DateTime | null) {
  const slots: DateTime[] = []
  let current = first

  while (slots.length < count) {
    if (until && current >= until) {
      break
    }
    slots.push(current)
    current = current.plus({ days: 7 })
  }

  return slots
}

export async function loadOccupiedLessons(user: User, trx?: TransactionClientContract) {
  return Lesson.query({ client: trx }).where('userId', user.id).whereNot('status', 'cancelled')
}

export async function findOverlappingLesson(
  user: User,
  scheduledAt: DateTime,
  options: {
    exceptLessonId?: number
    trx?: TransactionClientContract
    occupied?: Lesson[]
  } = {}
) {
  const occupied = options.occupied ?? (await loadOccupiedLessons(user, options.trx))

  return (
    occupied.find((lesson) => {
      if (options.exceptLessonId && lesson.id === options.exceptLessonId) {
        return false
      }
      return windowsOverlap(scheduledAt, lesson.scheduledAt)
    }) ?? null
  )
}

export async function assertSlotFree(
  user: User,
  scheduledAt: DateTime,
  options: {
    exceptLessonId?: number
    trx?: TransactionClientContract
    occupied?: Lesson[]
  } = {}
) {
  const conflict = await findOverlappingLesson(user, scheduledAt, options)

  if (conflict) {
    throw new LESSON_SCHEDULE_CONFLICT()
  }
}
