import { api } from '@/services/api'
import type { ApiData, CreateLessonInput, Lesson, UpdateLessonInput } from '@/types/api'

export async function listLessons(filters?: { studentId?: number; planId?: number }) {
  const { data } = await api.get<ApiData<Lesson[]>>('/lessons', {
    params: filters,
  })
  return data.data
}

export async function getLesson(id: number) {
  const { data } = await api.get<ApiData<Lesson>>(`/lessons/${id}`)
  return data.data
}

export async function createLesson(input: CreateLessonInput) {
  const { data } = await api.post<ApiData<Lesson>>('/lessons', input)
  return data.data
}

export async function updateLesson(id: number, input: UpdateLessonInput) {
  const { data } = await api.put<ApiData<Lesson>>(`/lessons/${id}`, input)
  return data.data
}

export async function deleteLesson(id: number) {
  await api.delete(`/lessons/${id}`)
}
