import User from '#models/user'
import { PACKAGES, type PlanPackage } from '#services/package_catalog'

export function createTeacher(overrides: { email?: string; fullName?: string } = {}) {
  return User.create({
    fullName: overrides.fullName ?? 'Teacher',
    email: overrides.email ?? 'teacher@example.com',
    password: 'password123',
  })
}

export async function createTeacherWithPlan(
  overrides: {
    email?: string
    package?: PlanPackage
    planStatus?: 'pending' | 'paid' | 'cancelled'
  } = {}
) {
  const teacher = await createTeacher({ email: overrides.email })
  const student = await teacher.related('students').create({
    name: 'Ana',
    instrument: 'piano',
  })
  const pack = overrides.package ?? 'pack_4'
  const catalog = PACKAGES[pack]
  const plan = await teacher.related('plans').create({
    studentId: student.id,
    package: pack,
    lessonsTotal: catalog.lessons,
    price: catalog.price,
    status: overrides.planStatus ?? 'paid',
  })

  return { teacher, student, plan }
}
