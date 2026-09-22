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
  knowledgeSubTag?: string | null
  body?: string | null
  options?: Array<string | Record<string, unknown>> | null
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
  subTags?: { name: string; total: number }[]
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

export interface GradeTrendPoint {
  date: string
  examType: ExamType
  score: number
  fullScore: number
  percent: number
}

export interface GradeTrend {
  subject: string
  points: GradeTrendPoint[]
}

export interface GradeRadarItem {
  subject: string
  avgPercent: number
  count: number
}

export interface GradeDistributionItem {
  key: 'excellent' | 'good' | 'pass' | 'fail'
  label: string
  count: number
}

export interface GradeCompareItem {
  studentId: number
  name: string
  grade?: string | null
  avgPercent: number
  count: number
}

export interface GradeSummary {
  trend: GradeTrend[]
  radar: GradeRadarItem[]
  distribution: GradeDistributionItem[]
  compare: GradeCompareItem[]
}

export interface AiConfig {
  hasBackendKey: boolean
  baseUrl: string
  model: string
  allowedBaseUrls?: string[]
}

export interface AiFormatPayload {
  text: string
  /**
   * 这段内容属于哪个字段：
   * stem=题干、body=补充说明、answer=答案与解析、auto=未知（按题干处理）。
   * 后端据此判断「多出来的答案解析」要不要删——answer 字段本身就是答案，绝不能删。
   */
  field?: 'stem' | 'body' | 'answer' | 'auto'
  apiKey?: string
  baseUrl?: string
  model?: string
}

export interface AiFormatResult {
  html: string
}

/** 课时总结的 AI 生成入参（学生/时间由前端补充，这里传作业与可用凭据） */
export interface AiLessonSummaryPayload {
  homeworkId: number
  studentId?: number | null
  extraNotes?: string
  apiKey?: string
  baseUrl?: string
  model?: string
}

export interface AiLessonSummaryResult {
  content: string
  classStatus: string
  homeworkTask: string
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
