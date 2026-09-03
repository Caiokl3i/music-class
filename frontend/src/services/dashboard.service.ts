import { isAxiosError } from 'axios'
import { api } from '@/services/api'
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

function filenameFromDisposition(header: string | undefined, fallback: string) {
  const quoted = header?.match(/filename="([^"]+)"/)
  if (quoted?.[1]) {
    return quoted[1]
  }
  const plain = header?.match(/filename=([^;]+)/)
  return plain?.[1]?.trim() ?? fallback
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function hydrateBlobError(error: unknown) {
  if (!isAxiosError(error) || !(error.response?.data instanceof Blob)) {
    return
  }

  const text = await error.response.data.text()
  try {
    error.response.data = JSON.parse(text)
  } catch {
    error.response.data = { message: text }
  }
}
