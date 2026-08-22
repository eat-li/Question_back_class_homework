import request from './request'

// AI 智能排版：把题目文本交给后端调用大模型，返回排版后的 HTML
export const formatQuestion = (data: any) => request.post('/ai/format', data)
