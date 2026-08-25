// 公共打印工具：统一「打开独立打印窗口 + 注入 KaTeX 样式 + 渲染公式 + 触发打印」逻辑。
// 供结论导出、作业导出、知识点题目导出共用，避免各处重复 window.open / print 样板代码。
import renderMathInElement from 'katex/contrib/auto-render'
import katexCss from 'katex/dist/katex.min.css?raw'
import { sanitizeHtml } from './sanitizeHtml'
import { escapeHtml } from './format'

export { escapeHtml }

// 独立打印窗口只注入 katex.min.css，不会带上 theme.css，这里补一份换行兜底样式，
// 防止长公式 / 块级公式在打印时溢出页面。
const katexWrapCss =
  '.katex{white-space:normal;overflow-wrap:break-word;max-width:100%}' +
  '.katex-display>.katex{white-space:normal}' +
  '.katex-display{max-width:100%;overflow-x:auto;overflow-y:hidden;padding:.4em 0}'

// 把 HTML 中的 $...$ / $$...$$ 公式渲染成 KaTeX HTML（供打印窗口使用）
export const renderMathHtml = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = sanitizeHtml(html)
  renderMathInElement(div, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false,
    strict: false
  })
  return div.innerHTML
}

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
