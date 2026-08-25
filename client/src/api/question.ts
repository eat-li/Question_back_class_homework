import request from './request'
import type { Question, QuestionStats, PageResult } from '../types'

export interface QuestionQuery {
  keyword?: string
  type?: string
  difficulty?: number
  knowledgeTag?: string
  page?: number
  pageSize?: number
}

export function getQuestions(
  params: QuestionQuery & { page: number; pageSize: number }
): Promise<PageResult<Question>>
export function getQuestions(params?: QuestionQuery): Promise<Question[]>
export function getQuestions(params?: QuestionQuery): Promise<Question[] | PageResult<Question>> {
  return request.get('/questions', { params }) as Promise<Question[] | PageResult<Question>>
}

export const getQuestionStats = (params?: { keyword?: string }): Promise<QuestionStats[]> =>
  request.get('/questions/stats', { params })
export const getQuestionTags = (): Promise<string[]> => request.get('/questions/tags')
export const createQuestion = (data: Partial<Question>) => request.post('/questions', data)
export const updateQuestion = (id: number, data: Partial<Question>) =>
  request.patch(`/questions/${id}`, data)
export const deleteQuestion = (id: number) => request.delete(`/questions/${id}`)
