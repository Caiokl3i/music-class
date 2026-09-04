import { api } from '@/services/api'
import type { ApiData, CreatePlanTypeInput, PlanType, UpdatePlanTypeInput } from '@/types/api'

export async function listPlanTypes() {
  const { data } = await api.get<ApiData<PlanType[]>>('/plan-types')
  return data.data
}

export async function createPlanType(input: CreatePlanTypeInput) {
  const { data } = await api.post<ApiData<PlanType>>('/plan-types', input)
  return data.data
}

export async function updatePlanType(id: number, input: UpdatePlanTypeInput) {
  const { data } = await api.put<ApiData<PlanType>>(`/plan-types/${id}`, input)
  return data.data
}

export async function deletePlanType(id: number) {
  await api.delete(`/plan-types/${id}`)
}
