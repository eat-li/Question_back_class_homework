// 题库领域常量：题型 / 难度 / 选项字母
// 与 server/src/models/Question.js 的 type 枚举保持一致

export const TYPE_TABS = [
  { label: '全部', value: 'all' },
  { label: '选择', value: 'choice' },
  { label: '填空', value: 'fill' },
  { label: '解答', value: 'solve' }
]

export const TYPE_TEXT = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}

export const DIFFICULTY_OPTIONS = [
  '全部难度',
  '1 星',
  '2 星',
  '3 星',
  '4 星',
  '5 星'
]

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function typeText(t) {
  return TYPE_TEXT[t] || ''
}

export function stars(n) {
  const v = Math.max(0, Math.min(5, Number(n) || 0))
  return '★'.repeat(v)
}

// 题目里的 options 是 JSON，历史数据里可能是字符串数组，也可能是 {text} 对象数组
export function normalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options
    .map((o) => {
      if (o === null || o === undefined) return ''
      if (typeof o === 'string') return o
      if (typeof o === 'object') {
        return String(o.text || o.label || o.content || o.value || '')
      }
      return String(o)
    })
    .filter((s) => String(s).trim() !== '')
}

export default { TYPE_TABS, TYPE_TEXT, DIFFICULTY_OPTIONS, OPTION_LETTERS, typeText, stars, normalizeOptions }
