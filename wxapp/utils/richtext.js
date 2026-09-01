// 富文本处理：喂给 <rich-text> 之前统一过一遍
//
// 三件事：
// 1. 图片 —— 补全 OSS 前缀、强制自适应宽度（题库图片多为题目截图，宽度失控最常见）
// 2. 公式 —— $...$ 在小程序里无法用 KaTeX 渲染，降级成可读文本（见 utils/latex.js）
// 3. 安全 —— 干掉 script/style，公式转换后的文本做转义，避免破坏 rich-text 解析
import config from '@/config/index.js'
import { latexToText } from './latex'

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', '#39': "'", '#x27': "'",
  ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…',
  times: '×', divide: '÷', plusmn: '±', le: '≤', ge: '≥', ne: '≠', deg: '°'
}

// 只转义会破坏 HTML 结构的三个字符。
// 注意：题干里原有的实体（如 &lt;）是数据库里就转义好的，这里不能再转义一次。
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z#][a-z0-9#]*);/gi, (m, n) =>
      Object.prototype.hasOwnProperty.call(NAMED, n) ? NAMED[n] : m
    )
}

function resolveSrc(src) {
  const s = String(src || '').trim()
  if (!s) return ''
  if (/^(https?:)?\/\//i.test(s) || s.indexOf('data:') === 0) return s
  return config.OSS_BASE.replace(/\/+$/, '') + '/' + s.replace(/^\/+/, '')
}

function fixImg(tag) {
  const m = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
  if (!m) return ''
  const src = resolveSrc(m[1] || m[2] || m[3])
  if (!src) return ''
  // rich-text 内部是 webview 渲染，样式要用 px；rpx 在这里不生效
  return '<img src="' + src + '" style="max-width:100%;height:auto;display:block;margin:6px 0;" />'
}

const HAS_MATH = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/

// 文本片段里的公式降级；没有公式时原样返回（避免二次转义已有实体）
//
// 顺序很关键，踩过一次坑：
// 题干里的小于大于号存的是实体（$a&gt;b$），必须先解码再转公式——
// 否则 convert() 会把 & 当成 LaTeX 的表格对齐符（& → 两个空格），$a&gt;b$ 会变成 "a  gt;b"。
// 解码 → 转公式 → 重新转义，对 < > & 三者是幂等的，公式外的文本不会受损。
function stripFormula(text) {
  if (text.indexOf('$') < 0) return text
  if (!HAS_MATH.test(text)) return text.replace(/\$/g, '')
  return escapeHtml(latexToText(decodeEntities(text)))
}

// 富文本 → 可直接交给 <rich-text nodes> 的 HTML 字符串
export function normalizeRichHtml(html) {
  if (!html) return ''
  let src = String(html)

  src = src.replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  src = src.replace(/<img\b[^>]*>/gi, (tag) => fixImg(tag))

  // 按标签切段，只处理文本段，公式不可能出现在标签内部
  src = src
    .split(/(<[^>]+>)/)
    .map((seg) => (!seg || seg.charAt(0) === '<' ? seg : stripFormula(seg)))
    .join('')

  // 空段落会让卡片出现大片空白
  src = src.replace(/<p>\s*<\/p>/gi, '')
  return src
}

// 抽出所有图片地址，供「查看原题图」用 previewImage 放大
export function extractImages(html) {
  const out = []
  const re = /<img\b[^>]*>/gi
  let m
  while ((m = re.exec(String(html || '')))) {
    const srcMatch = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[0])
    if (!srcMatch) continue
    const src = resolveSrc(srcMatch[1] || srcMatch[2] || srcMatch[3])
    if (src) out.push(src)
  }
  return out
}

// 富文本 → 纯文本（分享标题、搜索结果摘要用）
export function richTextToPlain(html) {
  const src = String(html || '')
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
  return latexToText(decodeEntities(src)).replace(/\s+/g, ' ').trim()
}

export default { normalizeRichHtml, extractImages, richTextToPlain }
