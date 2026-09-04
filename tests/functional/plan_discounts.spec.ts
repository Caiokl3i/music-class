import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import PlanDiscount from '#models/plan_discount'
import { createTeacherWithPlan } from '#tests/helpers'

test.group('Plan discounts and billing', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates updates and deletes a named discount on a plan', async ({ assert, client }) => {
    const { teacher, plan } = await createTeacherWithPlan({ planStatus: 'pending' })

    const created = await client
      .post(`/api/v1/plans/${plan.id}/discounts`)
      .loginAs(teacher)
      .json({
        name: 'Desconto sobrancelhas',
        amount: 25,
        serviceAt: '2026-02-14',
      })

    created.assertStatus(201)
    created.assertBodyContains({
      data: {
        planId: plan.id,
        name: 'Desconto sobrancelhas',
      },
    })
    assert.equal(Number(created.body().data.amount), 25)

    const discountId = created.body().data.id as number

    const updated = await client
      .patch(`/api/v1/plans/${plan.id}/discounts/${discountId}`)
      .loginAs(teacher)
      .json({ amount: 30, name: 'Desconto sobrancelhas VIP' })

    updated.assertStatus(200)
    assert.equal(Number(updated.body().data.amount), 30)
    assert.equal(updated.body().data.name, 'Desconto sobrancelhas VIP')

    const planResponse = await client.get(`/api/v1/plans/${plan.id}`).loginAs(teacher)
    planResponse.assertStatus(200)
    assert.equal(Number(planResponse.body().data.discountTotal), 30)
    assert.equal(Number(planResponse.body().data.netPrice), Number(plan.price) - 30)
    assert.lengthOf(planResponse.body().data.discounts, 1)

    const deleted = await client
      .delete(`/api/v1/plans/${plan.id}/discounts/${discountId}`)
      .loginAs(teacher)
    deleted.assertStatus(204)
    assert.equal(await PlanDiscount.query().where('id', discountId).count('* as total').then((rows) => Number(rows[0].$extras.total)), 0)
  })

  test('rejects discount on another teacher plan', async ({ client }) => {
    const { plan } = await createTeacherWithPlan({ email: 'owner@example.com' })
    const { teacher: other } = await createTeacherWithPlan({ email: 'other@example.com' })

    const response = await client
      .post(`/api/v1/plans/${plan.id}/discounts`)
      .loginAs(other)
      .json({ name: 'Hack', amount: 10 })

    response.assertStatus(404)
  })

  test('builds billing json and pdf for done lessons minus discounts', async ({
    assert,
    client,
  }) => {
    const { teacher, student, plan } = await createTeacherWithPlan({
      package: 'pack_4',
      planStatus: 'pending',
    })

    const zone = 'America/Sao_Paulo'
    await teacher.related('lessons').createMany([
      {
        studentId: student.id,
        planId: plan.id,
        scheduledAt: DateTime.fromISO('2026-02-13T17:00:00', { zone }),
        status: 'done',
      },
      {
        studentId: student.id,
        planId: plan.id,
        scheduledAt: DateTime.fromISO('2026-02-27T17:00:00', { zone }),
        status: 'done',
      },
      {
        studentId: student.id,
        planId: plan.id,
        scheduledAt: DateTime.fromISO('2026-03-06T17:00:00', { zone }),
        status: 'done',
      },
    ])

    await teacher.related('plans').query().where('id', plan.id).firstOrFail().then((owned) =>
      owned.related('discounts').create({
        userId: teacher.id,
        name: 'Desconto sobrancelhas',
        amount: 25,
        serviceAt: DateTime.fromISO('2026-02-14'),
      })
    )

    // Override price to match the WhatsApp example math: 2 × 27.50 = 55
    plan.price = 110
    await plan.save()

    const billing = await client
      .get(`/api/v1/plans/${plan.id}/billing`)
      .qs({ month: '2026-02', timezone: zone })
      .loginAs(teacher)

    billing.assertStatus(200)
    const body = billing.body().data
    assert.equal(Number(body.unitPrice), 27.5)
    assert.lengthOf(body.lessons, 2)
    assert.equal(Number(body.lessonsSubtotal), 55)
    assert.equal(Number(body.discountTotal), 25)
    assert.equal(Number(body.total), 30)
    assert.include(body.text, 'fevereiro')
    assert.include(body.text, 'Desconto sobrancelhas')

    const pdf = await client
      .get(`/api/v1/plans/${plan.id}/billing.pdf`)
      .qs({ month: '2026-02', timezone: zone })
      .loginAs(teacher)

    pdf.assertStatus(200)
    assert.equal(pdf.headers()['content-type'], 'application/pdf')
    assert.isTrue(Buffer.isBuffer(pdf.body()) || typeof pdf.text() === 'string')
    const bytes = Buffer.isBuffer(pdf.body()) ? pdf.body() : Buffer.from(pdf.text() ?? '', 'binary')
    assert.isTrue(bytes.subarray(0, 4).toString() === '%PDF' || bytes.length > 100)
  })

  test('dashboard pendingAmount uses net price after discounts', async ({ assert, client }) => {
    const { teacher, plan } = await createTeacherWithPlan({
      package: 'pack_4',
      planStatus: 'pending',
    })

    await PlanDiscount.create({
      userId: teacher.id,
      planId: plan.id,
      name: 'Troca',
      amount: 30,
      serviceAt: null,
    })

    const response = await client.get('/api/v1/dashboard?timezone=UTC').loginAs(teacher)
    response.assertStatus(200)
    assert.equal(Number(response.body().data.pendingAmount), 100)
    assert.equal(Number(response.body().data.unpaidPlans[0].price), 100)
  })
})
