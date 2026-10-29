import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ace from '@adonisjs/core/services/ace'
import User from '#models/user'
import Student from '#models/student'
import Plan from '#models/plan'
import Lesson from '#models/lesson'
import { DateTime } from 'luxon'
import { buildStudentDossier, anonymizeStudent } from '#services/lgpd_service'

async function createTeacher() {
  return await User.create({
    email: `teacher_${Date.now()}_${Math.random()}@example.com`,
    password: 'password123',
    fullName: 'Professor Teste LGPD',
  })
}

test.group('LGPD Export and Anonymization', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('buildStudentDossier returns null when student does not exist', async ({ assert }) => {
    const dossier = await buildStudentDossier(999999)
    assert.isNull(dossier)
  })

  test('buildStudentDossier compiles complete personal, plan and lesson history', async ({ assert }) => {
    const teacher = await createTeacher()

    const student = await Student.create({
      userId: teacher.id,
      name: 'João Carlos',
      instrument: 'Piano',
      phone: '11988887777',
      birthdate: DateTime.fromISO('2000-01-15'),
      level: 'intermediário',
      tags: 'erudito,noturno',
      preferredWeekday: 3,
      preferredTime: '19:00',
      description: 'Estudando Sonatas de Beethoven',
      color: '#0f766e',
    })

    const plan = await Plan.create({
      userId: teacher.id,
      studentId: student.id,
      package: 'mensal-4',
      price: 450,
      lessonsTotal: 4,
      status: 'paid',
      paidAt: DateTime.now(),
      notes: 'Pago via PIX',
    })

    await Lesson.create({
      userId: teacher.id,
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.now().plus({ days: 1 }),
      status: 'scheduled',
      description: 'Aula 1: Fraseado e Dinâmica',
    })

    const dossier = await buildStudentDossier(student.id)

    assert.isNotNull(dossier)
    assert.equal(dossier?.legalBasis, 'LGPD Art. 18, V - Portabilidade de Dados')
    assert.equal(dossier?.student.name, 'João Carlos')
    assert.equal(dossier?.student.instrument, 'Piano')
    assert.equal(dossier?.student.phone, '11988887777')
    assert.equal(dossier?.student.birthdate, '2000-01-15')
    assert.equal(dossier?.student.description, 'Estudando Sonatas de Beethoven')
    assert.equal(dossier?.plans.length, 1)
    assert.equal(dossier?.plans[0].package, 'mensal-4')
    assert.equal(dossier?.plans[0].price, 450)
    assert.equal(dossier?.lessons.length, 1)
    assert.equal(dossier?.lessons[0].description, 'Aula 1: Fraseado e Dinâmica')
  })

  test('anonymizeStudent removes personal identifiers while preserving financial records', async ({ assert }) => {
    const teacher = await createTeacher()

    const student = await Student.create({
      userId: teacher.id,
      name: 'Lucas Pereira',
      instrument: 'Guitarra',
      phone: '21977776666',
      birthdate: DateTime.fromISO('1995-04-10'),
      description: 'Observações pessoais confidenciais',
      tags: 'rock',
      color: '#0f766e',
    })

    const plan = await Plan.create({
      userId: teacher.id,
      studentId: student.id,
      package: 'trimestral-12',
      price: 1200,
      lessonsTotal: 12,
      status: 'paid',
      paidAt: DateTime.now(),
    })

    const lesson = await Lesson.create({
      userId: teacher.id,
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.now().minus({ days: 2 }),
      status: 'done',
      description: 'Comentários particulares sobre o aluno',
    })

    const ok = await anonymizeStudent(student.id)
    assert.isTrue(ok)

    const updatedStudent = await Student.findOrFail(student.id)
    assert.equal(updatedStudent.name, `Aluno Anonimizado #${student.id}`)
    assert.isNull(updatedStudent.phone)
    assert.isNull(updatedStudent.birthdate)
    assert.isNull(updatedStudent.description)
    assert.isNull(updatedStudent.tags)
    assert.equal(updatedStudent.instrument, 'Anonimizado')

    const updatedPlan = await Plan.findOrFail(plan.id)
    assert.equal(updatedPlan.price, 1200)
    assert.equal(updatedPlan.status, 'paid')

    const updatedLesson = await Lesson.findOrFail(lesson.id)
    assert.isNull(updatedLesson.description)
    assert.equal(updatedLesson.status, 'done')
  })

  test('Ace command lgpd:student exports dossier and returns 0', async ({ assert }) => {
    const teacher = await createTeacher()
    const student = await Student.create({
      userId: teacher.id,
      name: 'Mariana Costa',
      instrument: 'Flauta',
      phone: '31966665555',
      color: '#0f766e',
    })

    const command = await ace.exec('lgpd:student', [String(student.id)])
    assert.equal(command.exitCode, 0)
  })
})
