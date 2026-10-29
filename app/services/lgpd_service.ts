import Student from '#models/student'
import db from '@adonisjs/lucid/services/db'

export type StudentDossier = {
  exportDate: string
  version: string
  legalBasis: string
  student: {
    id: number
    name: string
    instrument: string
    phone: string | null
    birthdate: string | null
    level: string | null
    tags: string | null
    preferredWeekday: number | null
    preferredTime: string | null
    description: string | null
    archivedAt: string | null
    createdAt: string
  }
  plans: Array<{
    id: number
    package: string | null
    price: number
    lessonsTotal: number
    status: string
    paidAt: string | null
    expiresAt: string | null
    notes: string | null
    createdAt: string
  }>
  lessons: Array<{
    id: number
    scheduledAt: string
    endsAt: string | null
    status: string
    description: string | null
    createdAt: string
  }>
}

/**
 * Builds an interoperable JSON export of all personal and pedagogical data
 * associated with a specific student to satisfy LGPD Art. 18 portability requests.
 */
export async function buildStudentDossier(studentId: number): Promise<StudentDossier | null> {
  const student = await Student.find(studentId)
  if (!student) {
    return null
  }

  await student.load('plans')
  await student.load('lessons')

  return {
    exportDate: new Date().toISOString(),
    version: '1.0',
    legalBasis: 'LGPD Art. 18, V - Portabilidade de Dados',
    student: {
      id: student.id,
      name: student.name,
      instrument: student.instrument,
      phone: student.phone,
      birthdate: student.birthdate ? student.birthdate.toISODate() : null,
      level: student.level,
      tags: student.tags,
      preferredWeekday: student.preferredWeekday,
      preferredTime: student.preferredTime,
      description: student.description,
      archivedAt: student.archivedAt?.toISO() ?? null,
      createdAt: student.createdAt?.toISO() ?? new Date().toISOString(),
    },
    plans: student.plans.map((p) => ({
      id: p.id,
      package: p.package,
      price: p.price,
      lessonsTotal: p.lessonsTotal,
      status: p.status,
      paidAt: p.paidAt?.toISO() ?? null,
      expiresAt: p.expiresAt?.toISO() ?? null,
      notes: p.notes,
      createdAt: p.createdAt?.toISO() ?? new Date().toISOString(),
    })),
    lessons: student.lessons.map((l) => ({
      id: l.id,
      scheduledAt: l.scheduledAt?.toISO() ?? new Date().toISOString(),
      endsAt: l.endsAt?.toISO() ?? null,
      status: l.status,
      description: l.description,
      createdAt: l.createdAt?.toISO() ?? new Date().toISOString(),
    })),
  }
}

/**
 * Anonymizes student personal data to comply with "right to be forgotten"
 * while preserving accounting integrity (price and lesson records).
 */
export async function anonymizeStudent(studentId: number): Promise<boolean> {
  const student = await Student.find(studentId)
  if (!student) {
    return false
  }

  await db.transaction(async (trx) => {
    student.useTransaction(trx)
    student.name = `Aluno Anonimizado #${student.id}`
    student.phone = null
    student.birthdate = null
    student.instrument = 'Anonimizado'
    student.tags = null
    student.description = null
    await student.save()

    // Clear personal descriptions from past lessons
    await trx.from('lessons').where('student_id', student.id).update({ description: null })
  })

  return true
}
