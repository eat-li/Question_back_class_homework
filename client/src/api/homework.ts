import request from './request'

export const getHomeworks = (params?: any) => request.get('/homeworks', { params })
export const getHomework = (id: number) => request.get(`/homeworks/${id}`)
export const getHomeworkQuestions = (id: number) => request.get(`/homeworks/${id}/questions`)
export const createHomework = (data: any) => request.post('/homeworks', data)
export const updateHomework = (id: number, data: any) => request.patch(`/homeworks/${id}`, data)
export const deleteHomework = (id: number) => request.delete(`/homeworks/${id}`)
export const saveHomeworkScores = (id: number, scores: any[]) =>
  request.put(`/homeworks/${id}/scores`, { scores })
