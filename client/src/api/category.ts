import request from './request'
import type { KnowledgeCategory } from '../types'

export const getCategories = (): Promise<KnowledgeCategory[]> => request.get('/categories')
export const createCategory = (data: Partial<KnowledgeCategory>) =>
  request.post('/categories', data)
export const updateCategory = (id: number, data: Partial<KnowledgeCategory>) =>
  request.put(`/categories/${id}`, data)
export const deleteCategory = (id: number) => request.delete(`/categories/${id}`)
