import type { BadgeTone } from '@/components/Badge'
import type { LessonStatus, Plan, PlanStatus } from '@/types/api'

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
}

export const LESSON_STATUS: Record<LessonStatus, { label: string; tone: BadgeTone }> = {
  scheduled: { label: 'Agendada', tone: 'accent' },
  done: { label: 'Concluída', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  no_show: { label: 'Falta', tone: 'warning' },
}

export function planIsExpired(plan: { expiresAt?: string | null }, now = new Date()) {
  return Boolean(plan.expiresAt && new Date(plan.expiresAt) <= now)
}

export function isLowCredit(remaining: number, threshold = 1) {
  return remaining <= threshold
}

export function planHoldsCredits(plan: { status: PlanStatus }) {
  return plan.status !== 'cancelled'
}

/** Aulas que ainda ocupam vaga no pacote (não canceladas). */
export function planHasActiveLessons(planId: number, lessons: { planId: number; status: string }[]) {
  return lessons.some((lesson) => lesson.planId === planId && lesson.status !== 'cancelled')
}

export function planHasAnyLessons(planId: number, lessons: { planId: number }[]) {
  return lessons.some((lesson) => lesson.planId === planId)
}

export function canCancelPlan(
  plan: { id: number; status: PlanStatus },
  lessons: { planId: number; status: string }[],
) {
  return plan.status !== 'cancelled' && !planHasActiveLessons(plan.id, lessons)
}

export function canDeletePlan(plan: { id: number }, lessons: { planId: number }[]) {
  return !planHasAnyLessons(plan.id, lessons)
}

export function canGenerateLessons(plan: Plan, now = new Date()) {
  return planHoldsCredits(plan) && plan.lessonsSchedulable > 0 && !planIsExpired(plan, now)
}

export function bookablePlans<
  T extends {
    status: PlanStatus
    lessonsSchedulable?: number
    lessonsRemaining: number
    id: number
    expiresAt?: string | null
  },
>(plans: T[], editingPlanId?: number, now = new Date()) {
  return plans.filter((plan) => {
    const openSlots = plan.lessonsSchedulable ?? plan.lessonsRemaining
    return (
      planHoldsCredits(plan) &&
      !planIsExpired(plan, now) &&
      (editingPlanId === plan.id || openSlots > 0)
    )
  })
}
