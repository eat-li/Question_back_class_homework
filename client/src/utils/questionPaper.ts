// 题目试卷 HTML 生成：知识点题目导出、整库导出、题目浏览导出共用同一套排版模板。
// 之前这段模板只存在于 KnowledgeQuestions.vue 内部，新增导出入口时若不共用，
// 同一份排版逻辑很快就会在各处走样。
import { PAPER_FONT, escapeHtml } from './printHtml'
import { questionTypeLabel as typeLabel } from './format'

export interface QuestionPaperOptions {
  /** 试卷大标题 */
  title: string
  /** 标题下的副标题（如筛选条件说明），留空不显示 */
  subtitle?: string
  questions: any[]
  /** 附上答案与解析 */
  withAnswer?: boolean
  /** > 0 时每题后留出该高度的答题空白 */
  answerAreaHeight?: number
  /** 按一级知识点分组并加小标题（整库导出时用） */
  groupByKnowledge?: boolean
  /** 正文字号，默认 16 */
  fontSize?: number
}

const UNCLASSIFIED = '未分类'

// 选择题选项：A. / B. / C. …
const renderOptions = (q: any) => {
  if (!q.options || !Array.isArray(q.options)) return ''
  return `<div style="margin:6px 0 0 22px;">${q.options
    .map(
      (o: any, j: number) =>
        `<div style="margin:2px 0;">${String.fromCharCode(65 + j)}. ${escapeHtml(
          typeof o === 'string' ? o : JSON.stringify(o)
        )}</div>`
    )
    .join('')}</div>`
}

export const buildQuestionPaperHtml = (opts: QuestionPaperOptions): string => {
  const {
    title,
    subtitle = '',
    questions,
    withAnswer = false,
    answerAreaHeight = 0,
    groupByKnowledge = false,
    fontSize: fs = 16
  } = opts

  const renderQuestion = (q: any, no: number) => `
      <div style="margin-bottom:18px;page-break-inside:avoid;">
        <div style="margin-bottom:4px;">
          <span style="font-weight:700;">${no}.</span>
          <span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">【${escapeHtml(typeLabel(q.type))}】</span>
          ${q.difficulty ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">难度 ${q.difficulty} 星</span>` : ''}
        </div>
        <div>${q.title || ''}</div>
        ${renderOptions(q)}
        ${q.body ? `<div style="margin-top:4px;">${q.body}</div>` : ''}
        ${answerAreaHeight > 0 ? `<div style="height:${answerAreaHeight}px;"></div>` : ''}
        ${withAnswer && q.answer ? `<div style="color:#c0392b;margin-top:6px;"><b>【答案与解析】</b>${q.answer}</div>` : ''}
      </div>`

  let body = ''
  if (groupByKnowledge) {
    // 分组：一级知识点按题量降序（与题库卡片顺序一致），组内保持传入顺序
    const map = new Map<string, any[]>()
    for (const q of questions) {
      const key = q.knowledgeTag || UNCLASSIFIED
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(q)
    }
    let no = 0
    body = [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, list]) => {
        const head =
          `<div style="margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid #bbb;` +
          `font-size:${fs + 1}px;font-weight:700;">${escapeHtml(name)}` +
          `<span style="font-weight:400;color:#777;font-size:${fs - 3}px;margin-left:8px;">${list.length} 题</span></div>`
        return head + list.map((q) => renderQuestion(q, ++no)).join('')
      })
      .join('')
  } else {
    body = questions.map((q, i) => renderQuestion(q, i + 1)).join('')
  }

  return `<div style="font-family:${PAPER_FONT};font-size:${fs}px;line-height:1.8;color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;">
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      <div style="font-size:${fs + 6}px;font-weight:700;">${escapeHtml(title)}</div>
      ${subtitle ? `<div style="font-size:${fs - 1}px;color:#555;margin-top:6px;">${escapeHtml(subtitle)}</div>` : ''}
      <div style="font-size:${fs - 2}px;color:#555;margin-top:6px;">共 ${questions.length} 题${withAnswer ? '（含答案）' : ''}</div>
    </div>
    ${body}
  </div>`
}
