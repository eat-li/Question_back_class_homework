import request from './request'
import type {
  AiConfig,
  AiFormatPayload,
  AiFormatResult,
  AiLessonSummaryPayload,
  AiLessonSummaryResult
} from '../types'

// 获取后端 AI 配置状态（不会返回 Key 本身）
export const getAiConfig = (): Promise<AiConfig> => request.get('/ai/config')

// AI 智能排版：把题目文本交给后端调用大模型，返回排版后的 HTML
// 大模型生成较慢，单独放宽超时（默认全局 10s 必然超时）
export const formatQuestion = (data: AiFormatPayload): Promise<AiFormatResult> =>
  request.post('/ai/format', data, { timeout: 120000 })

// AI 课时总结：后端读取该作业的题目，生成「上课内容 / 上课状态 / 课后任务」
export const generateLessonSummary = (
  data: AiLessonSummaryPayload
): Promise<AiLessonSummaryResult> => request.post('/ai/lesson-summary', data, { timeout: 120000 })
