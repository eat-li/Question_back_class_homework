import request from './request'

export const getConclusions = (params?: any) => request.get('/conclusions', { params })
export const getConclusion = (id: number) => request.get(`/conclusions/${id}`)
export const createConclusion = (data: any) => request.post('/conclusions', data)
export const updateConclusion = (id: number, data: any) => request.put(`/conclusions/${id}`, data)
export const updateConclusionStatus = (id: number, status: 'draft' | 'published') =>
  request.patch(`/conclusions/${id}/status`, { status })
export const deleteConclusion = (id: number) => request.delete(`/conclusions/${id}`)
