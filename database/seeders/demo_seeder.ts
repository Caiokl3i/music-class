import { DateTime } from 'luxon'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Student from '#models/student'
import Plan from '#models/plan'
import Lesson from '#models/lesson'
import { CREDIT_VALIDITY_DAYS, PACKAGES, type DefaultPlanSlug } from '#services/package_catalog'
import { ensureDefaultPlanTypes } from '#services/plan_types'
import PlanType from '#models/plan_type'
import type { LessonStatus } from '#validators/lesson'

const DEMO_EMAIL = 'demo@musicclass.test'
const DEMO_PASSWORD = 'password123'
const ZONE = 'America/Sao_Paulo'

/**
 * Conta de estúdio com um de cada situação do painel:
 * aniversário hoje, aula de hoje, atrasada, próxima, falta, concluída,
 * pacote pendente, crédito baixo, validade acabando e pacote vencido.
 *
 * Rode de novo à vontade: apaga só os dados desta conta e recria.
 */
export default class DemoSeeder extends BaseSeeder {
  static environment = ['development']

  async run() {
    const teacher = await this.upsertTeacher()
    await this.clearStudio(teacher.id)
    await this.fillStudio(teacher)

    console.log('')
    console.log('Conta demo pronta. Entre no painel com:')
    console.log(`  e-mail  ${DEMO_EMAIL}`)
    console.log(`  senha   ${DEMO_PASSWORD}`)
    console.log('')
  }

  private async upsertTeacher() {
    const existing = await User.findBy('email', DEMO_EMAIL)
    if (existing) {
      existing.fullName = 'Marina Silva'
      existing.password = DEMO_PASSWORD
      await existing.save()
      return existing
    }

    return User.create({
      fullName: 'Marina Silva',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
  }

  private async clearStudio(userId: number) {
    await Lesson.query().where('userId', userId).delete()
    await Plan.query().where('userId', userId).delete()
    await PlanType.query().where('userId', userId).delete()
    await Student.query().where('userId', userId).delete()
  }

  private async fillStudio(teacher: User) {
    await ensureDefaultPlanTypes(teacher)
    const now = DateTime.now().setZone(ZONE)

    const ana = await this.student(teacher, {
      name: 'Ana Costa',
      instrument: 'piano',
      level: 'beginner',
      color: 'warning',
      tags: 'criança, pontual',
      phone: '11987654321',
      description: 'Começou em março. Gosta de trilha de filme.',
      birthdate: now.minus({ years: 10 }),
      preferredWeekday: 2,
      preferredTime: '14:00',
    })
    const anaPack = await this.plan(teacher, ana, 'pack_4', 'paid', now.minus({ days: 12 }), {
      notes: 'Pacote do mês — aniversário hoje.',
    })
    await this.lessons(teacher, ana, anaPack, [
      { days: -14, hour: 14, status: 'done', description: 'Escalas em Dó e Sol.' },
      { days: -7, hour: 14, status: 'done', description: 'Leitura rítmica.' },
      { days: 0, hour: 14, status: 'scheduled', description: 'Revisão da música de aniversário.' },
      { days: 7, hour: 14, status: 'scheduled' },
    ])

    const bruno = await this.student(teacher, {
      name: 'Bruno Alves',
      instrument: 'violão',
      level: 'intermediate',
      color: 'danger',
      tags: 'adolescente, rock',
      phone: '11976543210',
      description: 'Troca de acordes rápidos. Quer tocar músicas da banda.',
      birthdate: now.minus({ years: 15, months: 3 }),
      preferredWeekday: 3,
      preferredTime: '09:00',
    })
    const brunoPack = await this.plan(teacher, bruno, 'pack_8', 'paid', now.minus({ days: 50 }), {
      notes: 'Último crédito — vender o próximo pack.',
    })
    await this.lessons(teacher, bruno, brunoPack, [
      { days: -49, hour: 9, status: 'done', description: 'Pentatônica em Lá.' },
      { days: -42, hour: 9, status: 'done' },
      { days: -35, hour: 9, status: 'done' },
      { days: -28, hour: 9, status: 'done' },
      { days: -21, hour: 9, status: 'done' },
      { days: -14, hour: 9, status: 'done' },
      { days: -7, hour: 9, status: 'done', description: 'Solo da música nova.' },
      { days: 0, hour: 9, status: 'scheduled', description: 'Fechar o pacote e conversar o próximo.' },
    ])

    const clara = await this.student(teacher, {
      name: 'Clara Mendes',
      instrument: 'violino',
      level: 'beginner',
      color: 'accent',
      tags: 'criança',
      phone: '11965432109',
      description: 'Postura do arco ainda trava o som.',
      birthdate: now.minus({ years: 8, months: 1 }),
      preferredWeekday: 4,
      preferredTime: '15:00',
    })
    const claraPack = await this.plan(teacher, clara, 'pack_4', 'pending', null, {
      notes: 'Pai disse que paga sexta.',
    })
    await this.lessons(teacher, clara, claraPack, [
      { days: -10, hour: 15, status: 'done', description: 'Cordas soltas e afinação.' },
      { days: -3, hour: 15, status: 'no_show', description: 'Faltou — viagem da família.' },
      { days: 1, hour: 15, status: 'scheduled' },
    ])

    const diego = await this.student(teacher, {
      name: 'Diego Rocha',
      instrument: 'bateria',
      level: 'intermediate',
      color: 'success',
      tags: 'adolescente, banda',
      phone: '11954321098',
      description: 'Rende mais com metrônomo alto.',
      birthdate: now.minus({ years: 16, days: 40 }),
      preferredWeekday: 6,
      preferredTime: '16:00',
    })
    const diegoPack = await this.plan(teacher, diego, 'pack_4', 'paid', now.minus({ days: 56 }), {
      notes: 'Validade acaba em poucos dias.',
    })
    await this.lessons(teacher, diego, diegoPack, [
      { days: -21, hour: 16, status: 'done' },
      { days: -14, hour: 16, status: 'done', description: 'Virada de rock clássico.' },
      { days: -1, hour: 16, status: 'scheduled', description: 'Aula de ontem — remarcar.' },
    ])

    const elena = await this.student(teacher, {
      name: 'Elena Souza',
      instrument: 'canto',
      level: 'beginner',
      color: 'warning',
      tags: 'adulto',
      phone: '11943210987',
      description: 'Respiração e aquecimento. Ensaio de coral no fim de semana.',
      birthdate: now.minus({ years: 34, months: 6 }),
      preferredWeekday: 5,
      preferredTime: '11:00',
    })
    const elenaExpired = await this.plan(teacher, elena, 'pack_4', 'paid', now.minus({ days: 75 }), {
      notes: 'Pacote vencido com crédito parado.',
    })
    await this.lessons(teacher, elena, elenaExpired, [
      { days: -70, hour: 11, status: 'done' },
      { days: -63, hour: 11, status: 'done' },
    ])
    const elenaAvulsa = await this.plan(teacher, elena, 'single', 'paid', now.minus({ days: 2 }), {
      notes: 'Avulsa enquanto decide o próximo pack.',
    })
    await this.lessons(teacher, elena, elenaAvulsa, [
      { days: -2, hour: 11, status: 'done', description: 'Aquecimento e uma canção.' },
    ])

    const felipe = await this.student(teacher, {
      name: 'Felipe Lima',
      instrument: 'baixo',
      color: 'danger',
      phone: '11932109876',
      description: 'Voltou depois de uma pausa. Sem nível definido ainda.',
      birthdate: now.minus({ years: 28, months: 2 }),
      preferredWeekday: 3,
      preferredTime: '10:00',
    })
    const felipeCancelled = await this.plan(teacher, felipe, 'pack_4', 'cancelled', now.minus({ days: 90 }), {
      notes: 'Cancelado — mudou de cidade por um tempo.',
    })
    await this.lessons(teacher, felipe, felipeCancelled, [
      { days: -80, hour: 10, status: 'cancelled', description: 'Não chegou a começar.' },
    ])
    const felipeAvulsa = await this.plan(teacher, felipe, 'single', 'paid', now.minus({ days: 1 }), {
      notes: 'Primeira aula da volta.',
    })
    await this.lessons(teacher, felipe, felipeAvulsa, [
      { days: 1, hour: 10, status: 'scheduled', description: 'Relembrar walking bass.' },
    ])

    const gabriela = await this.student(teacher, {
      name: 'Gabriela Nunes',
      instrument: 'flauta',
      level: 'beginner',
      color: 'accent',
      tags: 'adulto, iniciante tarde',
      phone: '11921098765',
      description: 'Começou agora. Quer música de câmara leve.',
      birthdate: now.minus({ years: 41, days: 12 }),
      preferredWeekday: 1,
      preferredTime: '18:00',
    })
    const gabrielaPack = await this.plan(teacher, gabriela, 'pack_4', 'paid', now.minus({ days: 40 }), {
      notes: 'Uma aula cancelada — ainda tem 1 crédito.',
    })
    await this.lessons(teacher, gabriela, gabrielaPack, [
      { days: -28, hour: 18, status: 'done' },
      { days: -21, hour: 18, status: 'done' },
      { days: -14, hour: 18, status: 'done', description: 'Sonoridade no registro médio.' },
      { days: -4, hour: 18, status: 'cancelled', description: 'Gripe — crédito devolvido.' },
    ])
  }

  private student(
    teacher: User,
    payload: {
      name: string
      instrument: string
      level?: 'beginner' | 'intermediate'
      color?: 'accent' | 'success' | 'warning' | 'danger'
      tags?: string
      phone?: string
      description?: string
      birthdate?: DateTime
      preferredWeekday?: number
      preferredTime?: string
    }
  ) {
    return teacher.related('students').create({
      name: payload.name,
      instrument: payload.instrument,
      level: payload.level ?? null,
      color: payload.color ?? 'accent',
      tags: payload.tags ?? null,
      phone: payload.phone ?? null,
      description: payload.description ?? null,
      birthdate: payload.birthdate ?? null,
      preferredWeekday: payload.preferredWeekday ?? null,
      preferredTime: payload.preferredTime ?? null,
    })
  }

  private plan(
    teacher: User,
    student: Student,
    pack: DefaultPlanSlug,
    status: 'pending' | 'paid' | 'cancelled',
    paidAt: DateTime | null,
    extras: { notes?: string } = {}
  ) {
    const catalog = PACKAGES[pack]
    return teacher.related('plans').create({
      studentId: student.id,
      package: pack,
      lessonsTotal: catalog.lessons,
      price: catalog.price,
      status,
      paidAt,
      expiresAt: paidAt && status === 'paid' ? paidAt.plus({ days: CREDIT_VALIDITY_DAYS }) : null,
      notes: extras.notes ?? null,
    })
  }

  private lessons(
    teacher: User,
    student: Student,
    plan: Plan,
    items: Array<{
      days: number
      hour: number
      minute?: number
      status: LessonStatus
      description?: string
    }>
  ) {
    const now = DateTime.now().setZone(ZONE)
    return Lesson.createMany(
      items.map((item) => ({
        userId: teacher.id,
        studentId: student.id,
        planId: plan.id,
        scheduledAt: now.plus({ days: item.days }).set({
          hour: item.hour,
          minute: item.minute ?? 0,
          second: 0,
          millisecond: 0,
        }),
        status: item.status,
        description: item.description ?? null,
      }))
    )
  }
}
