import request from './request'

export const getQuestions = (params?: any) => request.get('/questions', { params })
export const createQuestion = (data: any) => request.post('/questions', data)
export const updateQuestion = (id: number, data: any) => request.patch(`/questions/${id}`, data)
export const deleteQuestion = (id: number) => request.delete(`/questions/${id}`)
