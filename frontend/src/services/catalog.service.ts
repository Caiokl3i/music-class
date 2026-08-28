import { api } from '@/services/api'
import type { ApiData, Catalog } from '@/types/api'

export async function getCatalog() {
  const { data } = await api.get<ApiData<Catalog>>('/packages')
  return data.data
}
