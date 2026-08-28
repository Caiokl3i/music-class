import { api } from '@/services/api'
import type { ApiData, Dashboard } from '@/types/api'

export async function getDashboard(timezone: string) {
  const { data } = await api.get<ApiData<Dashboard>>('/dashboard', {
    params: { timezone },
  })
  return data.data
}
