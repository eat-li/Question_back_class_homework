// 公共打印工具：统一「打开独立打印窗口 + 注入 KaTeX 样式 + 渲染公式 + 触发打印」逻辑。
// 供结论导出、作业导出、知识点题目导出共用，避免各处重复 window.open / print 样板代码。
import katexCss from 'katex/dist/katex.min.css?raw'
import { sanitizeHtml } from './sanitizeHtml'
import { renderMathInHtml } from './mathRender'
import { escapeHtml } from './format'

export { escapeHtml }

// 试卷导出字体（经典试卷风）：英文/数字/标点用 Times New Roman（与 KaTeX 公式的
// Times 风格字形统一），中文回退到宋体/思源宋体等衬线中文字体。
// 各导出模板（作业/题目/结论）统一引用，避免各写一份。
export const PAPER_FONT =
  "'Times New Roman','Times','宋体','SimSun','STSong','Songti SC','Noto Serif SC',serif"

// 独立打印窗口只注入 katex.min.css，不会带上 theme.css，这里补一份换行兜底样式，
// 防止长公式 / 块级公式在打印时溢出页面；同时给窗口设置试卷基础字体。
const katexWrapCss =
  `.katex{white-space:normal;overflow-wrap:break-word;max-width:100%}` +
  `.katex-display>.katex{white-space:normal}` +
  `.katex-display{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:.4em 0}` +
  `body{font-family:${PAPER_FONT};color:#222;}`

// 把 HTML 中的 $...$ / $$...$$ 公式渲染成 KaTeX HTML
// （字符串级渲染，公式被 <br> 拆成多段也能正确匹配，如 \begin{array} 表格）
export const renderMathHtml = (html: string): string => renderMathInHtml(html)

interface PrintHtmlOptions {
  // 额外注入的 CSS（如排版样式）；默认只注入 katex 与换行兜底
  extraCss?: string
  // 是否先把 bodyHtml 中的 $...$ 公式渲染成 KaTeX，默认 true
  renderMath?: boolean
  // 打印窗口尺寸
  width?: number
  height?: number
}

// 打开打印窗口并触发浏览器「打印 / 另存为 PDF」
// 返回是否成功打开窗口（false 表示被浏览器弹窗拦截）
export const printHtml = (
  title: string,
  bodyHtml: string,
  opts: PrintHtmlOptions = {}
): boolean => {
  const { extraCss = '', renderMath = true, width = 900, height = 700 } = opts
  const safeBody = sanitizeHtml(bodyHtml)
  const html = renderMath ? renderMathHtml(safeBody) : safeBody

  const win = window.open('', '_blank', `width=${width},height=${height}`)
  if (!win) return false

  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
      title
    )}</title><style>${katexCss}${katexWrapCss}${extraCss}</style></head><body>${html}</body></html>`
  )
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
  return true
}
