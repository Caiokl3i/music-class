import { api } from '@/services/api'
import type { ApiData, AuthResponse, User } from '@/types/api'

export async function signup(input: {
  fullName?: string | null
  email: string
  password: string
  passwordConfirmation: string
}) {
  const { data } = await api.post<ApiData<AuthResponse>>('/auth/signup', input)
  return data.data
}

export async function login(input: { email: string; password: string }) {
  const { data } = await api.post<ApiData<AuthResponse>>('/auth/login', input)
  return data.data
}

export async function fetchProfile() {
  const { data } = await api.get<ApiData<User>>('/account/profile')
  return data.data
}

export async function logout() {
  await api.post<{ message: string }>('/account/logout')
}
