// 二级知识点的掌握等级：基础 / 中等 / 进阶
// 三档配色集中在这里，题库侧栏的圆点、下拉选项、图例、题目表单都用同一份，避免各处颜色跑偏。
// 配色贴合当前暖调玻璃主题：基础=苔绿、中等=琥珀（主题色）、进阶=砖红。
export type KnowledgeLevel = 'basic' | 'medium' | 'advanced'

export interface KnowledgeLevelMeta {
  value: KnowledgeLevel
  label: string
  /** 主色：圆点、数字 */
  color: string
  /** 浅色底：标签背景 */
  soft: string
}

export const KNOWLEDGE_LEVELS: KnowledgeLevelMeta[] = [
  { value: 'basic', label: '基础', color: '#3f7d5c', soft: 'rgba(63, 125, 92, 0.14)' },
  { value: 'medium', label: '中等', color: '#96681a', soft: 'rgba(150, 104, 26, 0.14)' },
  { value: 'advanced', label: '进阶', color: '#b04a3f', soft: 'rgba(176, 74, 63, 0.13)' }
]

export const knowledgeLevelMeta = (level?: string | null): KnowledgeLevelMeta | null =>
  KNOWLEDGE_LEVELS.find((l) => l.value === level) || null

export const knowledgeLevelLabel = (level?: string | null): string =>
  knowledgeLevelMeta(level)?.label || '未定级'
