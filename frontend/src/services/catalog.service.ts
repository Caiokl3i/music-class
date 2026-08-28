import { api } from '@/services/api'
import type { ApiData, PackageOption } from '@/types/api'

export async function listPackages() {
  const { data } = await api.get<ApiData<PackageOption[]>>('/packages')
  return data.data
}
