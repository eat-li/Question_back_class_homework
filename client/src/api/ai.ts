import request from './request'

// 获取后端 AI 配置状态（不会返回 Key 本身）
export const getAiConfig = () => request.get('/ai/config')

// AI 智能排版：把题目文本交给后端调用大模型，返回排版后的 HTML
// 大模型生成较慢，单独放宽超时（默认全局 10s 必然超时）
export const formatQuestion = (data: any) =>
  request.post('/ai/format', data, { timeout: 120000 })
