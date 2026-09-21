import request from './request'
import type { Question, QuestionStats, PageResult } from '../types'

export interface QuestionQuery {
  keyword?: string
  type?: string
  difficulty?: number
  knowledgeTag?: string
  knowledgeSubTag?: string
  /** 按 id 批量取（逗号分隔，如 '3,7,9'） */
  ids?: string
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
export const getQuestionSubTags = (
  knowledgeTag?: string
): Promise<{ name: string; total: number }[]> =>
  request.get('/questions/subtags', { params: knowledgeTag ? { knowledgeTag } : undefined })
export const renameQuestionTag = (from: string, to: string): Promise<{ updated: number }> =>
  request.patch('/questions/rename-tag', { from, to })

export interface UpdateSubTagPayload {
  /** 原二级知识点名称 */
  from: string
  /** 新名称；空表示移回未分类（等效删除该二级知识点） */
  to?: string | null
  /** 限定作用的一级知识点；'__empty__' 表示未分类题库；不传 = 全部题库 */
  knowledgeTag?: string | null
  /** 同时更换所属一级知识点；null 表示改为未分类；不传 = 不更换 */
  toKnowledgeTag?: string | null
}

/** 编辑二级知识点：重命名 / 合并 / 删除（移回未分类）/ 更换所属题库 */
export const updateQuestionSubTag = (
  data: UpdateSubTagPayload
): Promise<{ updated: number; cleared: boolean }> =>
  request.patch('/questions/update-subtag', data)
export const createQuestion = (data: Partial<Question>) => request.post('/questions', data)
export const updateQuestion = (id: number, data: Partial<Question>) =>
  request.patch(`/questions/${id}`, data)
export const deleteQuestion = (id: number) => request.delete(`/questions/${id}`)
