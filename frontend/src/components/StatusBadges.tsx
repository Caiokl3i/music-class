import { Badge } from '@/components/Badge'
import { LESSON_STATUS, PLAN_STATUS } from '@/domain/status'
import type { LessonStatus, PlanStatus } from '@/types/api'

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge tone={PLAN_STATUS[status].tone}>{PLAN_STATUS[status].label}</Badge>
}

export function LessonStatusBadge({ status }: { status: LessonStatus }) {
  return <Badge tone={LESSON_STATUS[status].tone}>{LESSON_STATUS[status].label}</Badge>
}
