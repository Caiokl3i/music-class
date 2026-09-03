import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { createTeacher, createTeacherWithPlan } from '#tests/helpers'

test.group('Month export', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/export?month=2026-09')
    response.assertStatus(401)
  })

  test('rejects an invalid month', async ({ client }) => {
    const { teacher } = await createTeacherWithPlan()
    const response = await client.get('/api/v1/export?month=2026-13').loginAs(teacher)
    response.assertStatus(422)
  })

  test('exports this teacher lessons and plans for the month as CSV', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({
      paidAt: DateTime.fromISO('2026-09-01T15:00:00.000Z'),
    })
    await plan.merge({ notes: 'PIX' }).save()

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-08T17:00:00.000Z'),
      status: 'done',
      description: 'Escala maior',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-08-25T17:00:00.000Z'),
      status: 'done',
      description: 'Fora do mes',
    })

    const other = await createTeacher({ email: 'other@example.com' })
    const spy = await other.related('students').create({
      name: 'Espiao',
      instrument: 'guitarra',
    })
    const otherPlan = await other.related('plans').create({
      studentId: spy.id,
      package: 'single',
      lessonsTotal: 1,
      price: 35,
      status: 'paid',
      paidAt: DateTime.fromISO('2026-09-02T12:00:00.000Z'),
      notes: 'OUTRO_PROFESSOR',
    })
    await other.related('lessons').create({
      studentId: spy.id,
      planId: otherPlan.id,
      scheduledAt: DateTime.fromISO('2026-09-02T14:00:00.000Z'),
      status: 'done',
      description: 'AULA_ALHEIA',
    })

    const response = await client
      .get('/api/v1/export?month=2026-09&timezone=UTC')
      .loginAs(teacher)

    response.assertStatus(200)
    assert.include(String(response.header('content-type')), 'text/csv')
    assert.include(
      String(response.header('content-disposition')),
      'filename="music-class-2026-09.csv"'
    )

    const csv = response.text()
    assert.include(csv, 'tipo;data;aluno;instrumento;pacote;status;valor;anotação')
    assert.include(csv, 'aula;2026-09-08 17:00–18:00;Ana;piano;Pacote mensal 1;Concluída;;Escala maior')
    assert.include(csv, 'pacote;2026-09-01 15:00;Ana;piano;Pacote mensal 1;Pago;130,00;PIX')
    assert.notInclude(csv, 'Fora do mes')
    assert.notInclude(csv, 'Espiao')
    assert.notInclude(csv, 'OUTRO_PROFESSOR')
    assert.notInclude(csv, 'AULA_ALHEIA')
  })

  test('uses the studio timezone to decide which day belongs to the month', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({
      paidAt: DateTime.fromISO('2026-08-01T12:00:00.000Z'),
    })

    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-01T02:00:00.000Z'),
      status: 'scheduled',
      description: 'ainda_agosto_brt',
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: DateTime.fromISO('2026-09-01T03:00:00.000Z'),
      status: 'scheduled',
      description: 'setembro_brt',
    })

    const response = await client
      .get('/api/v1/export?month=2026-09&timezone=America/Sao_Paulo')
      .loginAs(teacher)

    response.assertStatus(200)
    const csv = response.text()
    assert.include(csv, 'setembro_brt')
    assert.notInclude(csv, 'ainda_agosto_brt')
  })

  test('defaults to the current month in the given timezone', async ({ assert, client }) => {
    const now = DateTime.now().setZone('UTC')
    const { teacher, student, plan } = await createTeacherWithPlan({
      paidAt: now,
    })
    await teacher.related('lessons').create({
      studentId: student.id,
      planId: plan.id,
      scheduledAt: now,
      status: 'scheduled',
      description: 'aula_atual',
    })

    const response = await client.get('/api/v1/export?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)
    assert.include(
      String(response.header('content-disposition')),
      `filename="music-class-${now.toFormat('yyyy-MM')}.csv"`
    )
    assert.include(response.text(), 'aula_atual')
  })
})
