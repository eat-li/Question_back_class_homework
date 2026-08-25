import request from './request'
import type { Student, PageResult } from '../types'

export interface StudentQuery {
  keyword?: string
  grade?: string
  page?: number
  pageSize?: number
}

export function getStudents(
  params: StudentQuery & { page: number; pageSize: number }
): Promise<PageResult<Student>>
export function getStudents(params?: StudentQuery): Promise<Student[]>
export function getStudents(params?: StudentQuery): Promise<Student[] | PageResult<Student>> {
  return request.get('/students', { params }) as Promise<Student[] | PageResult<Student>>
}

export const createStudent = (data: Partial<Student>) => request.post('/students', data)
export const updateStudent = (id: number, data: Partial<Student>) =>
  request.patch(`/students/${id}`, data)
export const deleteStudent = (id: number) => request.delete(`/students/${id}`)
export const importStudents = (data: Array<Pick<Student, 'name'> & Partial<Student>>) =>
  request.post('/students/import', data)
