import { DateTime } from 'luxon'
import User from '#models/user'
import { PACKAGES, CREDIT_VALIDITY_DAYS, type PlanPackage } from '#services/package_catalog'
import { ensureDefaultPlanTypes } from '#services/plan_types'

export const TEST_INVITE_CODE = 'test-invite'

export async function createTeacher(overrides: { email?: string; fullName?: string } = {}) {
  const teacher = await User.create({
    fullName: overrides.fullName ?? 'Teacher',
    email: overrides.email ?? 'teacher@example.com',
    password: 'password123',
  })
  await ensureDefaultPlanTypes(teacher)
  return teacher
}

export async function createTeacherWithPlan(
  overrides: {
    email?: string
    package?: PlanPackage
    planStatus?: 'pending' | 'paid' | 'cancelled'
    paidAt?: DateTime | null
  } = {}
) {
  const teacher = await createTeacher({ email: overrides.email })
  const student = await teacher.related('students').create({
    name: 'Ana',
    instrument: 'piano',
  })
  const pack = overrides.package ?? 'pack_4'
  const catalog = PACKAGES[pack]
  const status = overrides.planStatus ?? 'paid'
  const paidAt =
    overrides.paidAt !== undefined
      ? overrides.paidAt
      : status === 'paid'
        ? DateTime.now()
        : null

  const plan = await teacher.related('plans').create({
    studentId: student.id,
    package: pack,
    lessonsTotal: catalog.lessons,
    price: catalog.price,
    status,
    paidAt,
    expiresAt: paidAt ? paidAt.plus({ days: CREDIT_VALIDITY_DAYS }) : null,
  })

  return { teacher, student, plan }
}
