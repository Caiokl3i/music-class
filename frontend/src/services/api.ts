import axios from 'axios'
import { clearStoredToken, getStoredToken } from '@/utils/token'

const baseURL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3333'}/api/v1`

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredToken()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)
