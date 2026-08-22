// AI 排版控制器：调用 OpenAI 兼容接口，把题目文本排版成规范 HTML
const { ok, fail } = require('../utils/response')

const SYSTEM_PROMPT = `你是数学老师专用的题目排版助手。用户会粘贴一道数学题（可能包含题干、选项、答案等，格式较乱）。请把它整理成规范的 HTML 富文本，用于网页展示。要求：

1. 分段清晰，都用 <p> 标签：题干单独一段；选项（A/B/C/D…）每个单独一行；答案与解析放在最后，用 <p><strong>答案：</strong>…</p> 的形式。
2. 所有数学公式、分式、根号、上下标、希腊字母等，一律转成 LaTeX 并用 $...$（行内）或 $$...$$（独立成行）包裹，例如 x^2 写成 $x^2$，二分之一写成 $\\frac{1}{2}$。
3. 中文和普通文字保持原样，不翻译、不改写题意、不增删任何数字、条件或符号。
4. 只输出排版后的 HTML 片段：不要 <html>、<body>、<head> 等外层标签，不要用 \`\`\` 代码块标记包裹，不要任何解释说明或客套话。`

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

exports.format = async (req, res, next) => {
  try {
    const { text, apiKey, baseUrl, model } = req.body || {}
    if (!text || !String(text).trim()) return fail(res, 40000, '没有可排版的题目内容')
    if (!apiKey || !String(apiKey).trim()) return fail(res, 40000, '请先填写 API Key')

    const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
    const url = `${base}/chat/completions`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)

    let resp
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${String(apiKey).trim()}`
        },
        body: JSON.stringify({
          model: String(model || DEFAULT_MODEL).trim(),
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: String(text) }
          ],
          temperature: 0.2
        }),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timer)
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      let msg = `AI 接口返回错误（HTTP ${resp.status}）`
      try {
        const j = JSON.parse(errText)
        if (j?.error?.message) msg = j.error.message
      } catch {
        /* 保留默认信息 */
      }
      return fail(res, 50200, msg)
    }

    const data = await resp.json()
    let html = data?.choices?.[0]?.message?.content || ''
    html = String(html)
      .trim()
      .replace(/^```(?:html|HTML)?\s*/g, '')
      .replace(/```\s*$/g, '')
    if (!html) return fail(res, 50200, 'AI 未返回排版结果')

    ok(res, { html }, '排版完成')
  } catch (e) {
    if (e?.name === 'AbortError') return fail(res, 50200, 'AI 排版超时，请稍后重试')
    next(e)
  }
}
