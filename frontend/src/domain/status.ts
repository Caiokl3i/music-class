import type { LessonStatus, PlanStatus } from '@/types/api'

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

export function bookablePlans<T extends { status: PlanStatus; lessonsRemaining: number; id: number }>(
  plans: T[],
  editingPlanId?: number,
) {
  return plans.filter(
    (plan) => plan.status === 'paid' && (editingPlanId === plan.id || plan.lessonsRemaining > 0),
  )
}
