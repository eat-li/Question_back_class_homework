import request from './request'

// 课时总结（关联作业，可指定学生）
export interface LessonSummary {
  id: number
  homeworkId: number
  studentId?: number | null
  lessonAt?: string | null
  lessonNo?: number | null
  content?: string | null
  classStatus?: string | null
  homeworkTask?: string | null
  student?: { id: number; name: string; grade?: string | null } | null
  homework?: { id: number; title?: string | null } | null
  createdAt?: string
  updatedAt?: string
}

export const getSummaries = (params: {
  homeworkId?: number
  studentId?: number
}): Promise<LessonSummary[]> => request.get('/summaries', { params })

export const getSummary = (id: number): Promise<LessonSummary> => request.get(`/summaries/${id}`)

export const createSummary = (data: Partial<LessonSummary>) => request.post('/summaries', data)
export const updateSummary = (id: number, data: Partial<LessonSummary>) =>
  request.patch(`/summaries/${id}`, data)
export const deleteSummary = (id: number) => request.delete(`/summaries/${id}`)
