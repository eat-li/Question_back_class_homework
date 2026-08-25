import request from './request'
import type { Conclusion, PageResult } from '../types'

export interface ConclusionQuery {
  categoryId?: number
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export const getConclusions = (params?: ConclusionQuery): Promise<PageResult<Conclusion>> =>
  request.get('/conclusions', { params })
export const getConclusion = (id: number): Promise<Conclusion> => request.get(`/conclusions/${id}`)
export const createConclusion = (data: Partial<Conclusion>) => request.post('/conclusions', data)
export const updateConclusion = (id: number, data: Partial<Conclusion>) =>
  request.put(`/conclusions/${id}`, data)
export const updateConclusionStatus = (id: number, status: 'draft' | 'published') =>
  request.patch(`/conclusions/${id}/status`, { status })
export const deleteConclusion = (id: number) => request.delete(`/conclusions/${id}`)
