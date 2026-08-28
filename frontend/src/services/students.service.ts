import { api } from '@/services/api'
import type { ApiData, CreateStudentInput, Student, UpdateStudentInput } from '@/types/api'

export async function listStudents() {
  const { data } = await api.get<ApiData<Student[]>>('/students')
  return data.data
}

export async function getStudent(id: number) {
  const { data } = await api.get<ApiData<Student>>(`/students/${id}`)
  return data.data
}

export async function createStudent(input: CreateStudentInput) {
  const { data } = await api.post<ApiData<Student>>('/students', input)
  return data.data
}

export async function updateStudent(id: number, input: UpdateStudentInput) {
  const { data } = await api.put<ApiData<Student>>(`/students/${id}`, input)
  return data.data
}

export async function deleteStudent(id: number) {
  await api.delete(`/students/${id}`)
}
