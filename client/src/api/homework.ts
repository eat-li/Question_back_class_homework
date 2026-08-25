import request from './request'
import type { Homework, Question, PageResult } from '../types'

export interface HomeworkQuery {
  status?: string
  page?: number
  pageSize?: number
}

export function getHomeworks(
  params: HomeworkQuery & { page: number; pageSize: number }
): Promise<PageResult<Homework>>
export function getHomeworks(params?: HomeworkQuery): Promise<Homework[]>
export function getHomeworks(params?: HomeworkQuery): Promise<Homework[] | PageResult<Homework>> {
  return request.get('/homeworks', { params }) as Promise<Homework[] | PageResult<Homework>>
}

export const getHomework = (id: number): Promise<Homework> => request.get(`/homeworks/${id}`)
export const getHomeworkQuestions = (id: number): Promise<Question[]> =>
  request.get(`/homeworks/${id}/questions`)
export const createHomework = (data: Partial<Homework>) => request.post('/homeworks', data)
export const updateHomework = (id: number, data: Partial<Homework>) =>
  request.patch(`/homeworks/${id}`, data)
export const deleteHomework = (id: number) => request.delete(`/homeworks/${id}`)
export const saveHomeworkScores = (
  id: number,
  scores: Array<{ studentId: number; score: number }>
) => request.put(`/homeworks/${id}/scores`, { scores })
