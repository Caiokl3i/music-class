import type { LessonStatus, Plan, PlanStatus } from '@/types/api'

export const PLAN_STATUS: Record<PlanStatus, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
}

export const LESSON_STATUS: Record<
  LessonStatus,
  { label: string; tone: 'brand' | 'success' | 'neutral' | 'warning' }
> = {
  scheduled: { label: 'Agendada', tone: 'brand' },
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

export function canGenerateLessons(plan: Plan, now = new Date()) {
  return plan.status === 'paid' && plan.lessonsRemaining > 0 && !planIsExpired(plan, now)
}

export function bookablePlans<
  T extends { status: PlanStatus; lessonsRemaining: number; id: number; expiresAt?: string | null },
>(plans: T[], editingPlanId?: number, now = new Date()) {
  return plans.filter(
    (plan) =>
      plan.status === 'paid' &&
      !planIsExpired(plan, now) &&
      (editingPlanId === plan.id || plan.lessonsRemaining > 0),
  )
}
