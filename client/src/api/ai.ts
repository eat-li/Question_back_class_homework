import request from './request'

// 获取后端 AI 配置状态（不会返回 Key 本身）
export const getAiConfig = () => request.get('/ai/config')

// AI 智能排版：把题目文本交给后端调用大模型，返回排版后的 HTML
export const formatQuestion = (data: any) => request.post('/ai/format', data)
