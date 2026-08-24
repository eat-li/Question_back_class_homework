import request from './request'

export const getGrades = (params?: any) => request.get('/grades', { params })
export const getGradeSummary = (params?: any) => request.get('/grades/summary', { params })
export const createGrade = (data: any) => request.post('/grades', data)
export const importGrades = (data: any[]) => request.post('/grades/import', data)
export const updateGrade = (id: number, data: any) => request.patch(`/grades/${id}`, data)
export const deleteGrade = (id: number) => request.delete(`/grades/${id}`)
