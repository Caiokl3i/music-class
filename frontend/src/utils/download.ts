import { isAxiosError } from 'axios'

export function filenameFromDisposition(header: string | undefined, fallback: string) {
  const quoted = header?.match(/filename="([^"]+)"/)
  if (quoted?.[1]) {
    return quoted[1]
  }
  const plain = header?.match(/filename=([^;]+)/)
  return plain?.[1]?.trim() ?? fallback
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function hydrateBlobError(error: unknown) {
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
