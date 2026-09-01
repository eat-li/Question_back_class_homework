// AI 排版控制器：调用 OpenAI 兼容接口，把题目文本排版成规范 HTML
const { ok, fail } = require('../utils/response')

const SYSTEM_PROMPT = `你是数学老师专用的题目排版助手。用户会粘贴一道数学题（可能包含题干、选项、答案等，格式较乱）。请把它整理成规范的 HTML 富文本，用于网页展示。要求：

1. 结构清晰：题干单独一个 <p>；选择题选项（A/B/C/D…）每个单独一行，写成 <p>A. …</p>；答案与解析放在最后，用 <p><strong>答案：</strong>…</p> 的形式。
2. 数学公式（重点）：所有公式一律用 $...$（行内）或 $$...$$（独立成行）包裹。分式用 \\dfrac{分子}{分母}；根号用 \\sqrt{...}；上下标用 ^ 与 _（如 x^2、a_{1}）；希腊字母用 \\alpha \\beta \\gamma \\theta \\lambda \\pi \\sigma \\varphi 等；常用符号用 \\ge \\le \\ne \\pm \\times \\div \\in \\subset \\cup \\cap \\infty \\sum \\prod \\rightarrow 等。
3. 禁止事项：严禁输出 Unicode 数学符号（如 ² ³ √ ∑ ≥ ≤ ≠ ½ α β），必须全部转成 LaTeX 命令；严禁在公式外面使用 $ 字符；严禁改变题目中的任何数字、条件、符号或文字；不翻译、不补全、不改写题意。
4. 输出：只输出排版后的 HTML 片段本身——不要 <html>、<body>、<head> 等外层标签，不要用 \`\`\` 代码块标记包裹，不要任何解释说明或客套话。`

// 默认面向 DeepSeek OpenAI 兼容接口；也可通过 .env 覆盖
const DEFAULT_BASE_URL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = process.env.AI_MODEL || 'deepseek-chat'

// AI 接口调用超时（毫秒）：大模型生成较慢，给足时间
const AI_TIMEOUT_MS = 120000

// 清洗 AI 返回的 HTML：去代码块、归一化公式定界符、压缩空白
function cleanAiHtml(html) {
  let out = String(html || '')
    .trim()
    .replace(/^```(?:html|HTML)?\s*/g, '')
    .replace(/```\s*$/g, '')
    .replace(/<\/?(?:html|body|head)[^>]*>/gi, '')
  // 模型可能用 \(...\) / \[...\] 而非 $...$ / $$...$$，统一转成 KaTeX 约定
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`)
  out = out.replace(/\\\(([^()]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`)
  // 压缩多余空行
  out = out.replace(/\n{3,}/g, '\n\n').trim()
  return out
}

// 返回 AI 配置状态（不返回 Key 本身），供前端判断是否需要填写 Key
exports.config = async (req, res, next) => {
  try {
    const backendKey = process.env.AI_API_KEY || ''
    ok(res, {
      hasBackendKey: Boolean(backendKey.trim()),
      baseUrl: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
      model: process.env.AI_MODEL || DEFAULT_MODEL
    })
  } catch (e) {
    next(e)
  }
}

exports.format = async (req, res, next) => {
  try {
    const { text, apiKey, baseUrl, model } = req.body || {}
    if (!text || !String(text).trim()) return fail(res, 40000, '没有可排版的题目内容')

    // 优先使用前端传入的 Key；未传时使用后端 .env 的 AI_API_KEY
    const effectiveKey = String(apiKey || process.env.AI_API_KEY || '').trim()
    if (!effectiveKey) return fail(res, 40000, '请先填写 API Key 或在后端 .env 配置 AI_API_KEY')

    const base = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
    const url = `${base}/chat/completions`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    let resp
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`
        },
        body: JSON.stringify({
          model: String(model || DEFAULT_MODEL).trim(),
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: String(text) }
          ],
          temperature: 0.2,
          max_tokens: 4096
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
    html = cleanAiHtml(html)
    if (!html) return fail(res, 50200, 'AI 未返回排版结果')

    ok(res, { html }, '排版完成')
  } catch (e) {
    if (e?.name === 'AbortError') return fail(res, 50200, 'AI 排版超时，请稍后重试或改用本地公式修复')
    next(e)
  }
}
