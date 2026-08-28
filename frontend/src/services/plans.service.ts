import { api } from '@/services/api'
import type { ApiData, CreatePlanInput, Plan, UpdatePlanInput } from '@/types/api'

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
