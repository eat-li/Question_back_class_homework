import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'div',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'a',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'sub',
  'sup',
  'figure',
  'figcaption',
  'section',
  'header',
  'footer',
  'article',
  'main'
]

const ALLOWED_ATTR = [
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
]

export interface SanitizeHtmlOptions {
  allowStyle?: boolean
}

function scrubStyleValues(html: string): string {
  if (!html || typeof document === 'undefined') return html || ''
  const template = document.createElement('template')
  template.innerHTML = html
  for (const el of Array.from(template.content.querySelectorAll<HTMLElement>('[style]'))) {
    const style = el.getAttribute('style') || ''
    const unsafe =
      /(?:javascript\s*:|vbscript\s*:|expression\s*\(|url\s*\(\s*['"]?\s*(?:javascript|vbscript)\s*:)/i
    if (unsafe.test(style)) el.removeAttribute('style')
  }
  return template.innerHTML
}

export function sanitizeHtml(html: string, options: SanitizeHtmlOptions = {}): string {
  if (!html || typeof window === 'undefined') return html || ''

  const allowStyle = options.allowStyle !== false
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: allowStyle ? ALLOWED_ATTR : ALLOWED_ATTR.filter((attr) => attr !== 'style'),
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'link',
      'meta',
      'template',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'video',
      'audio'
    ]
  })

  return allowStyle ? scrubStyleValues(clean) : clean
}

export const sanitizeRichHtml = (html: string): string => sanitizeHtml(html, { allowStyle: false })
