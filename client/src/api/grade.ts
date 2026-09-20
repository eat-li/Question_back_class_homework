import request from './request'
import type { ExamScore, GradeCard, GradeSummary } from '../types'

export interface GradeQuery {
  studentId?: number
  subject?: string
  examType?: string
  startDate?: string
  endDate?: string
  examDate?: string
  studentName?: string
}

export const getGrades = (params?: GradeQuery): Promise<ExamScore[]> =>
  request.get('/grades', { params })
export const getGradeCards = (params?: GradeQuery): Promise<GradeCard[]> =>
  request.get('/grades/cards', { params })
export const getGradeSummary = (params?: GradeQuery): Promise<GradeSummary> =>
  request.get('/grades/summary', { params })
export const createGrade = (data: Partial<ExamScore>) => request.post('/grades', data)
export const importGrades = (data: Array<Partial<ExamScore>>) =>
  request.post('/grades/import', data)
export const updateGrade = (id: number, data: Partial<ExamScore>) =>
  request.patch(`/grades/${id}`, data)
export const deleteGrade = (id: number) => request.delete(`/grades/${id}`)
