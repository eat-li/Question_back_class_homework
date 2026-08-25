// 全局前端类型定义：与后端模型保持一致
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface Student {
  id: number
  name: string
  grade?: string | null
  contact?: string | null
  remark?: string | null
  createdAt?: string
  updatedAt?: string
}

export type QuestionType = 'choice' | 'fill' | 'solve'

export interface Question {
  id: number
  title: string
  type: QuestionType
  difficulty: number
  knowledgeTag?: string | null
  body?: string | null
  options?: any[] | null
  answer?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface QuestionStats {
  tag: string
  label: string
  total: number
  choice: number
  fill: number
  solve: number
}

export type HomeworkStatus = 'draft' | 'published' | 'closed'

export interface Homework {
  id: number
  title: string
  questionIds: number[]
  studentIds: number[]
  startAt?: string | null
  endAt?: string | null
  status: HomeworkStatus
  remark?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Submission {
  id: number
  homeworkId: number
  studentId: number
  score: number
  student?: Student
  createdAt?: string
  updatedAt?: string
}

export type ExamType = 'final' | 'mid' | 'quiz' | 'popquiz'

export interface ExamScore {
  id: number
  studentId: number
  examType: ExamType
  subject: string
  score: number
  fullScore: number
  examDate: string
  comment?: string | null
  student?: Student
  createdAt?: string
  updatedAt?: string
}

export interface GradeCard {
  id: number
  name: string
  grade?: string | null
  examCount: number
  latest?: Pick<
    ExamScore,
    'id' | 'studentId' | 'examType' | 'subject' | 'score' | 'fullScore' | 'examDate' | 'comment'
  > | null
}

export interface KnowledgeCategory {
  id: number
  name: string
  parentId?: number | null
  sort: number
  remark?: string | null
  children?: KnowledgeCategory[]
}

export type ConclusionStatus = 'draft' | 'published'

export interface Conclusion {
  id: number
  title: string
  categoryId: number
  content: string
  summary?: string | null
  status: ConclusionStatus
  tags?: string | null
  category?: KnowledgeCategory
  createdAt?: string
  updatedAt?: string
}
