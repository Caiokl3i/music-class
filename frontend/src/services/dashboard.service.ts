import { api } from '@/services/api'
import { filenameFromDisposition, hydrateBlobError, saveBlob } from '@/utils/download'
import type { ApiData, Dashboard } from '@/types/api'

export async function getDashboard(timezone: string) {
  const { data } = await api.get<ApiData<Dashboard>>('/dashboard', {
    params: { timezone },
  })
  return data.data
}

export async function downloadMonthCsv(month: string, timezone: string) {
  try {
    const response = await api.get<Blob>('/export', {
      params: { month, timezone },
      responseType: 'blob',
    })
    const filename = filenameFromDisposition(
      response.headers['content-disposition'],
      `music-class-${month}.csv`,
    )
    saveBlob(response.data, filename)
  } catch (error) {
    await hydrateBlobError(error)
    throw error
  }
}

export async function downloadMonthPdf(month: string, timezone: string) {
  try {
    const response = await api.get<Blob>('/export.pdf', {
      params: { month, timezone },
      responseType: 'blob',
    })
    const filename = filenameFromDisposition(
      response.headers['content-disposition'],
      `music-class-${month}.pdf`,
    )
    saveBlob(response.data, filename)
  } catch (error) {
    await hydrateBlobError(error)
    throw error
  }
}
