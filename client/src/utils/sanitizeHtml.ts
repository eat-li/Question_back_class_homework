// 轻量 HTML 消毒工具：用于富文本展示和打印前，移除脚本、事件属性、危险协议等。
// 适用于本地教师工具；如后续需要更严格的策略，可替换为 DOMPurify。

const ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'HR',
  'DIV',
  'SPAN',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'CODE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'IMG',
  'A',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TH',
  'TD',
  'SUB',
  'SUP',
  'FIGURE',
  'FIGCAPTION',
  'SECTION',
  'HEADER',
  'FOOTER',
  'ARTICLE',
  'MAIN'
])

const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
  'NOSCRIPT',
  'TEMPLATE',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'VIDEO',
  'AUDIO'
])

const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'target',
  'rel',
  'class',
  'style',
  'colspan',
  'rowspan',
  'start',
  'type'
])

export function sanitizeHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html || ''

  const template = document.createElement('template')
  template.innerHTML = html

  const elements = Array.from(template.content.querySelectorAll('*'))
  for (const el of elements) {
    const tag = el.tagName.toUpperCase()

    // 危险标签直接删除
    if (DANGEROUS_TAGS.has(tag)) {
      el.remove()
      continue
    }

    // 非白名单标签：保留子内容，去掉标签本身
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes))
      continue
    }

    // 清理属性：只保留白名单属性，去掉 on* 和危险协议
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }

      const value = attr.value.trim().toLowerCase()
      if (
        (name === 'href' || name === 'src' || name === 'style') &&
        (value.includes('javascript:') ||
          value.includes('expression(') ||
          value.includes('vbscript:'))
      ) {
        el.removeAttribute(attr.name)
        continue
      }
      if (name === 'src' && value.startsWith('data:') && !value.startsWith('data:image/')) {
        el.removeAttribute(attr.name)
        continue
      }
    }
  }

  return template.innerHTML
}
