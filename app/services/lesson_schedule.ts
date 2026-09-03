import { DateTime } from 'luxon'
import { createError } from '@adonisjs/core/exceptions'
import Lesson from '#models/lesson'
import { LESSON_DURATION_MINUTES } from '#services/package_catalog'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export const MAX_LESSON_MINUTES = 8 * 60

export const LESSON_SCHEDULE_CONFLICT = createError(
  'This time overlaps another scheduled lesson',
  'E_LESSON_SCHEDULE_CONFLICT',
  422
)

export const LESSON_INVALID_DURATION = createError(
  'Lesson end must be after the start',
  'E_LESSON_INVALID_DURATION',
  422
)

export function defaultLessonEnd(start: DateTime) {
  return start.plus({ minutes: LESSON_DURATION_MINUTES })
}

export function lessonEnd(start: DateTime, endsAt?: DateTime | null) {
  return endsAt ?? defaultLessonEnd(start)
}

/** Half-open windows: back-to-back lessons do not overlap. */
export function windowsOverlap(aStart: DateTime, aEnd: DateTime, bStart: DateTime, bEnd: DateTime) {
  return aStart < bEnd && bStart < aEnd
}

export function resolveLessonWindow(
  start: DateTime,
  requestedEnd?: DateTime | null,
  previous?: { scheduledAt: DateTime; endsAt?: DateTime | null }
) {
  let endsAt = requestedEnd ?? null

  if (!endsAt && previous?.endsAt) {
    const durationMs = previous.endsAt.toMillis() - previous.scheduledAt.toMillis()
    if (durationMs > 0) {
      endsAt = start.plus({ milliseconds: durationMs })
    }
  }

  endsAt = endsAt ?? defaultLessonEnd(start)
  assertValidLessonWindow(start, endsAt)
  return { scheduledAt: start, endsAt }
}

export function assertValidLessonWindow(start: DateTime, endsAt: DateTime) {
  if (!start.isValid || !endsAt.isValid || endsAt <= start) {
    throw new LESSON_INVALID_DURATION()
  }

  if (endsAt.diff(start, 'minutes').minutes > MAX_LESSON_MINUTES) {
    throw new LESSON_INVALID_DURATION()
  }
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
    endsAt?: DateTime
    exceptLessonId?: number
    trx?: TransactionClientContract
    occupied?: Lesson[]
  } = {}
) {
  const endsAt = options.endsAt ?? defaultLessonEnd(scheduledAt)
  const occupied = options.occupied ?? (await loadOccupiedLessons(user, options.trx))

  return (
    occupied.find((lesson) => {
      if (options.exceptLessonId && lesson.id === options.exceptLessonId) {
        return false
      }
      return windowsOverlap(
        scheduledAt,
        endsAt,
        lesson.scheduledAt,
        lessonEnd(lesson.scheduledAt, lesson.endsAt)
      )
    }) ?? null
  )
}

export async function assertSlotFree(
  user: User,
  scheduledAt: DateTime,
  options: {
    endsAt?: DateTime
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
