import request from './request'
import type { Question, Conclusion } from '../types'

export type HandoutItemType = 'question' | 'conclusion' | 'knowledge'

/** 讲义内容项：知识点项的 id 指向知识点分类，渲染时连同其下属结论成块展示 */
export interface HandoutItem {
  type: HandoutItemType
  id: number
}

export interface Handout {
  id: number
  title: string
  status: 'draft' | 'published'
  remark?: string | null
  items: HandoutItem[]
  createdAt?: string
  updatedAt?: string
}

/** 知识点区块：分类名 + 其（含子分类）下全部结论 */
export interface KnowledgeBlock {
  id: number
  name: string
  conclusions: Conclusion[]
}

/** GET /handouts/:id/items 的返回：items 已剔除被删除的题目/结论/分类 */
export interface HandoutItems {
  items: HandoutItem[]
  questions: Question[]
  conclusions: Conclusion[]
  knowledges: KnowledgeBlock[]
}

export interface HandoutQuery {
  keyword?: string
  page?: number
  pageSize?: number
}

export const getHandouts = (params?: HandoutQuery): Promise<{ list: Handout[]; total: number }> =>
  request.get('/handouts', { params })
export const getHandout = (id: number): Promise<Handout> => request.get(`/handouts/${id}`)
export const getHandoutItems = (id: number): Promise<HandoutItems> =>
  request.get(`/handouts/${id}/items`)
export const createHandout = (data: Partial<Handout>): Promise<Handout> =>
  request.post('/handouts', data)
export const updateHandout = (id: number, data: Partial<Handout>): Promise<Handout> =>
  request.patch(`/handouts/${id}`, data)
export const deleteHandout = (id: number) => request.delete(`/handouts/${id}`)
