import request from './request'

export const getStudents = (params?: any) => request.get('/students', { params })
export const createStudent = (data: any) => request.post('/students', data)
export const updateStudent = (id: number, data: any) => request.patch(`/students/${id}`, data)
export const deleteStudent = (id: number) => request.delete(`/students/${id}`)
