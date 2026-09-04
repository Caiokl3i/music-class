import { api } from '@/services/api'
import type {
  ApiData,
  BillingSummary,
  CreatePlanDiscountInput,
  CreatePlanInput,
  Lesson,
  Plan,
  PlanDiscount,
  UpdatePlanDiscountInput,
  UpdatePlanInput,
} from '@/types/api'
import { APP_TIMEZONE } from '@/utils/format'

export async function listPlans(studentId?: number) {
  const { data } = await api.get<ApiData<Plan[]>>('/plans', {
    params: studentId ? { studentId } : undefined,
  })
  return data.data
}

export async function getPlan(id: number) {
  const { data } = await api.get<ApiData<Plan>>(`/plans/${id}`)
  return data.data
}

export async function createPlan(input: CreatePlanInput) {
  const { data } = await api.post<ApiData<Plan>>('/plans', input)
  return data.data
}

export async function updatePlan(id: number, input: UpdatePlanInput) {
  const { data } = await api.put<ApiData<Plan>>(`/plans/${id}`, input)
  return data.data
}

export async function deletePlan(id: number) {
  await api.delete(`/plans/${id}`)
}

export async function generatePlanLessons(planId: number, firstScheduledAt: string) {
  const { data } = await api.post<ApiData<Lesson[]>>(`/plans/${planId}/lessons/generate`, {
    firstScheduledAt,
  })
  return data.data
}

export async function createPlanDiscount(planId: number, input: CreatePlanDiscountInput) {
  const { data } = await api.post<ApiData<PlanDiscount>>(`/plans/${planId}/discounts`, input)
  return data.data
}

export async function updatePlanDiscount(
  planId: number,
  discountId: number,
  input: UpdatePlanDiscountInput,
) {
  const { data } = await api.patch<ApiData<PlanDiscount>>(
    `/plans/${planId}/discounts/${discountId}`,
    input,
  )
  return data.data
}

export async function deletePlanDiscount(planId: number, discountId: number) {
  await api.delete(`/plans/${planId}/discounts/${discountId}`)
}

export async function getPlanBilling(planId: number, month?: string | null) {
  const { data } = await api.get<ApiData<BillingSummary>>(`/plans/${planId}/billing`, {
    params: {
      timezone: APP_TIMEZONE,
      ...(month ? { month } : {}),
    },
  })
  return data.data
}

export async function downloadPlanBillingPdf(planId: number, month?: string | null) {
  const response = await api.get<Blob>(`/plans/${planId}/billing.pdf`, {
    params: {
      timezone: APP_TIMEZONE,
      ...(month ? { month } : {}),
    },
    responseType: 'blob',
  })

  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `cobranca-${planId}.pdf`

  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
