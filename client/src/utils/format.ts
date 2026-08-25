// 公共格式化工具：日期、题型、富文本清洗、HTML 转义
export const questionTypeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}

export const questionTypeLabel = (t: string) => questionTypeMap[t] || t

export const formatDateTime = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

export const escapeHtml = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[c]
  })
