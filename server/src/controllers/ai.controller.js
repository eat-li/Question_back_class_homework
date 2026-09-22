// AI 控制器：OpenAI 兼容接口
//  - /ai/format         题目智能排版（文本 → 规范 HTML）
//  - /ai/lesson-summary 课时总结生成（读取作业题目 → 四段式总结）
const { ok, fail } = require('../utils/response')
const { Homework, HomeworkQuestion, Question, Student } = require('../models')

const SYSTEM_PROMPT = `你是数学老师专用的题目排版助手。用户会给你一段已经写好的内容（可能只是题干，也可能是题干+选项，或者答案与解析），请把它整理成规范的 HTML 富文本，用于网页展示。要求：

1. 只整理用户给出的内容，一个字都不许新增。用户没写的选项、条件、答案、解析、结论、评注，输出里一个都不能出现；也不要补全、不要改写题意、不要翻译。原文没有答案或解析时，输出里绝对不能出现「答案：」「解析：」这类段落——这是最容易犯的错，务必避免。
2. 结构清晰：正文（题干）单独一个 <p>；原文若有选择题选项（A/B/C/D…），每个选项单独一行，写成 <p>A. …</p>；原文若本来就带答案与解析，保留它们并规范成 <p><strong>答案：</strong>…</p> 的形式。
3. 数学公式（重点）：所有公式一律用 $...$（行内）或 $$...$$（独立成行）包裹。分式用 \\dfrac{分子}{分母}；根号用 \\sqrt{...}；上下标用 ^ 与 _（如 x^2、a_{1}）；希腊字母用 \\alpha \\beta \\gamma \\theta \\lambda \\pi \\sigma \\varphi 等；常用符号用 \\ge \\le \\ne \\pm \\times \\div \\in \\subset \\cup \\cap \\infty \\sum \\prod \\rightarrow 等。
4. 禁止事项：严禁输出 Unicode 数学符号（如 ² ³ √ ∑ ≥ ≤ ≠ ½ α β），必须全部转成 LaTeX 命令；严禁在公式外面使用 $ 字符；严禁改变原文中的任何数字、条件、符号或文字。
5. 输出：只输出排版后的 HTML 片段本身——不要 <html>、<body>、<head> 等外层标签，不要用 \`\`\` 代码块标记包裹，不要任何解释说明或客套话。`

const LESSON_PROMPT = `你是数学老师专用的教学助理。下面会给出一位学生某次课所布置作业的题目清单（含题型与知识点）。请据此写一份「课时总结」，用于发给家长与学生。要求：

1. 上课内容：用 2-4 句话概括本次课涉及的知识点与题型（结合题目中的知识点），条理清晰、专业简洁。
2. 上课状态：写 1-2 句对学生本次课学习状态的描述，可涉及接受速度、易错点、需要注意的细节；措辞客观、以鼓励为主，不要臆造夸张结论。
3. 课后任务：说明课后需要完成的练习与复习要点（结合题目），1-2 句。
4. 每一段都是独立完整的一段话；不要使用 Markdown 标题、列表符号或编号；不要抄录题目原文。
5. 只输出 JSON，不要代码块、不要多余解释，格式严格为：
{"content":"上课内容文本","classStatus":"上课状态文本","homeworkTask":"课后任务文本"}`

// 默认面向 DeepSeek OpenAI 兼容接口；也可通过 .env 覆盖
const DEFAULT_BASE_URL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1'
const DEFAULT_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const BUILTIN_ALLOWED_BASE_URLS = ['https://api.deepseek.com/v1', 'https://api.openai.com/v1']

// AI 接口调用超时（毫秒）：大模型生成较慢，给足时间
const AI_TIMEOUT_MS = 120000

/* ===================== 地址白名单 ===================== */

function normalizeBaseUrl(raw) {
  const input = String(raw || '')
    .trim()
    .replace(/\/+$/, '')
  if (!input) return ''
  let url
  try {
    url = new URL(input)
  } catch {
    return ''
  }
  if (url.protocol !== 'https:') return ''
  return url.toString().replace(/\/+$/, '')
}

function getAllowedBaseUrls() {
  const configured = String(process.env.AI_ALLOWED_BASE_URLS || '')
    .split(',')
    .map(normalizeBaseUrl)
    .filter(Boolean)
  return [
    ...new Set(
      [...BUILTIN_ALLOWED_BASE_URLS, DEFAULT_BASE_URL, ...configured]
        .map(normalizeBaseUrl)
        .filter(Boolean)
    )
  ]
}

// 显式放行任意接口地址（自建 / 中转 / 本地模型场景）；
// 默认关闭，保持白名单带来的 SSRF 防护
function isAnyBaseUrlAllowed() {
  return String(process.env.AI_ALLOW_ANY_BASE_URL || '').trim().toLowerCase() === 'true'
}

// 放行模式下允许 http（本地 Ollama / LM Studio 等），但仍拒绝非 http(s) 协议
function normalizeAnyBaseUrl(raw) {
  const input = String(raw || '')
    .trim()
    .replace(/\/+$/, '')
  if (!input) return ''
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function resolveBaseUrl(baseUrl) {
  if (isAnyBaseUrlAllowed()) return normalizeAnyBaseUrl(baseUrl || DEFAULT_BASE_URL) || null
  const normalized = normalizeBaseUrl(baseUrl || DEFAULT_BASE_URL)
  if (!normalized) return null
  const allowed = getAllowedBaseUrls()
  return allowed.includes(normalized) ? normalized : null
}

// 解析调用目标（Key / 地址 / 模型）；失败返回 { error }
function resolveAiTarget({ apiKey, baseUrl, model }) {
  const key = String(apiKey || process.env.AI_API_KEY || '').trim()
  if (!key) return { error: '请先填写 API Key 或在后端 .env 配置 AI_API_KEY' }
  const base = resolveBaseUrl(baseUrl)
  if (!base) {
    const allowed = getAllowedBaseUrls()
    return {
      error:
        `AI 接口地址不在允许列表中：${normalizeAnyBaseUrl(baseUrl) || baseUrl || '（空）'}。` +
        `当前允许：${allowed.join('、')}。` +
        `请把该地址追加到 server/.env 的 AI_ALLOWED_BASE_URLS（逗号分隔）后重启后端；` +
        `或设置 AI_ALLOW_ANY_BASE_URL=true 放行任意地址。`
    }
  }
  return { key, base, model: String(model || DEFAULT_MODEL).trim() }
}

/* ===================== 调用与解析工具 ===================== */

// 调用 chat/completions，返回助手文本；失败抛出带 httpStatus 的错误
async function callChat({ key, base, model, messages, temperature = 0.2, maxTokens = 4096 }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  let resp
  try {
    resp = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
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
    const err = new Error(msg)
    err.httpStatus = 50200
    throw err
  }

  const data = await resp.json()
  return String(data?.choices?.[0]?.message?.content || '')
}

// 统一的错误应答：超时 / 接口报错 / 网络层失败 / 其它
function replyAiError(res, next, e, targetBase) {
  if (e?.name === 'AbortError') {
    return fail(res, 50200, 'AI 请求超时，请稍后重试或改用本地公式修复')
  }
  if (e?.httpStatus) return fail(res, e.httpStatus, e.message)
  if (e?.cause || e?.code) {
    const detail = e?.cause?.code || e?.cause?.message || e?.code || '网络错误'
    return fail(
      res,
      50200,
      `无法连接 AI 接口（${detail}）：${targetBase || '（地址为空）'}。` +
        `请检查接口地址是否正确、能否从本机访问，以及该服务是否可用。`
    )
  }
  return next(e)
}

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

// 富文本 → 纯文本（供拼装题目清单，避免把 HTML 塞给模型）
function plainText(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ===================== 答案泄漏兜底 ===================== */
// 背景：提示词写得再严，模型偶尔仍会在「题干」里凭空补出一段答案与解析。
// 题干会被题库列表、作业预览、PDF 导出直接展示，答案漏出去等于泄题，
// 所以这里做一道确定性兜底，而不是只靠模型自觉。

// 原文里出现这些字样，说明用户排版的本来就是答案内容（或在题干里提到了答案），不做任何删除
const ANSWER_HINT_RE = /答案|解析|参考解答|参考答案/

// 「整段就是答案」的判定：答案标记必须出现在这一段的开头。
// 不能用「包含」——否则「…求 f(2) 的值。答案：5」这种把答案跟在正文后面的段落会被整段误删。
const ANSWER_HEAD_RE =
  /^\s*(?:【\s*(?:参考)?(?:答案|解析|解答)\s*】|(?:参考)?(?:答案|解析)(?:\s*[：:]|\s*$)|解\s*[：:])/

// 行内答案标记：句末标点或换行之后紧跟「答案：」「解析：」这类字样。
// 第一组捕获句末标点本身，截断时把它留在原地，否则会把正文的句号一起切掉。
const ANSWER_INLINE_RE =
  /((?:[。；;！？!?]|<br\s*\/?>)\s*)(?:(?:<[^>]+>\s*)*(?:【\s*)?(?:参考)?(?:答案|解析)(?:\s*】)?\s*[：:])/

const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'col'])

// 截断很可能切在段落中间，留下未闭合的标签；配平一下，让返回的 HTML 结构完整。
// （模型输出通常是扁平的 p / strong / br，简单栈配平足够）
function balanceTags(html) {
  const open = []
  const re = /<(\/?)([a-zA-Z][\w-]*)(?:\s[^>]*)?>/g
  let m
  while ((m = re.exec(html))) {
    const name = m[2].toLowerCase()
    if (VOID_TAGS.has(name)) continue
    if (m[1] === '/') {
      const i = open.lastIndexOf(name)
      if (i >= 0) open.splice(i, 1)
    } else {
      open.push(name)
    }
  }
  return html + open.reverse().map((n) => `</${n}>`).join('')
}

// 去掉模型凭空补出的答案解析；field === 'answer' 时整段内容本来就是答案，直接放行。
// 返回空串表示「整份结果都是多余的答案」，由调用方报错，避免把答案静默写进题干。
function stripUnrequestedAnswer(sourceText, html, field) {
  if (String(field || '') === 'answer') return html
  if (!html) return html
  // 原文自带答案 → 交给模型按格式规范化，不删
  if (ANSWER_HINT_RE.test(plainText(sourceText))) return html

  // 原文完全没有「答案 / 解析」字样，因此输出里出现的任何一处都是模型自己加的。
  // 先按块级标签切开，从第一段「以答案标记开头」的段落起整体截掉。
  const blocks = html.split(/(?<=<\/(?:p|div|li|h[1-6]|blockquote|td|tr)>)/i)
  let cut = blocks.length
  for (let i = 0; i < blocks.length; i++) {
    if (ANSWER_HEAD_RE.test(plainText(blocks[i]))) {
      cut = i
      break
    }
  }
  let kept = cut < blocks.length ? blocks.slice(0, cut).join('') : html

  // 答案跟在正文同一段里（如「…求 f(2) 的值。答案：5」）时，从标记处截断，句末标点保留
  const inline = ANSWER_INLINE_RE.exec(kept)
  if (inline) kept = kept.slice(0, inline.index + inline[1].length)

  kept = kept.trim()
  return kept ? balanceTags(kept) : ''
}

// 解析课时总结 JSON；模型没按格式输出时兜底为整段「上课内容」
function parseLessonJson(raw) {
  const text = String(raw || '')
    .trim()
    .replace(/^```(?:json|JSON)?\s*/g, '')
    .replace(/```\s*$/g, '')
    .trim()
  const tryParse = (s) => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }
  let obj = tryParse(text)
  if (!obj) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) obj = tryParse(text.slice(start, end + 1))
  }
  if (obj && typeof obj === 'object') {
    return {
      content: String(obj.content || '').trim(),
      classStatus: String(obj.classStatus || '').trim(),
      homeworkTask: String(obj.homeworkTask || '').trim()
    }
  }
  return { content: text, classStatus: '', homeworkTask: '' }
}

/* ===================== 接口 ===================== */

// 返回 AI 配置状态（不返回 Key 本身），供前端判断是否需要填写 Key
exports.config = async (req, res, next) => {
  try {
    const backendKey = process.env.AI_API_KEY || ''
    ok(res, {
      hasBackendKey: Boolean(backendKey.trim()),
      baseUrl: process.env.AI_BASE_URL || DEFAULT_BASE_URL,
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      allowedBaseUrls: getAllowedBaseUrls()
    })
  } catch (e) {
    next(e)
  }
}

// 题目智能排版
exports.format = async (req, res, next) => {
  let targetBase = ''
  try {
    // field 告知这段内容属于哪个字段：题干 stem / 补充说明 body / 答案与解析 answer。
    // 只有知道字段身份，才能安全判断「多出来的答案解析」该不该删。
    const { text, field, apiKey, baseUrl, model } = req.body || {}
    if (!text || !String(text).trim()) return fail(res, 40000, '没有可排版的题目内容')

    const target = resolveAiTarget({ apiKey, baseUrl, model })
    if (target.error) return fail(res, 40000, target.error)
    targetBase = target.base

    const raw = await callChat({
      ...target,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: String(text) }
      ]
    })
    let html = cleanAiHtml(raw)
    if (!html) return fail(res, 50200, 'AI 未返回排版结果')

    html = stripUnrequestedAnswer(String(text), html, field)
    if (!html) {
      return fail(
        res,
        50200,
        'AI 返回的内容全是原文里没有的答案解析，已全部丢弃，未写入编辑器；请重试或改用「本地修复公式」'
      )
    }

    ok(res, { html }, '排版完成')
  } catch (e) {
    replyAiError(res, next, e, targetBase)
  }
}

// 课时总结生成：读取作业题目 → 四段式总结（上课内容 / 上课状态 / 课后任务）
exports.lessonSummary = async (req, res, next) => {
  let targetBase = ''
  try {
    const { homeworkId, studentId, apiKey, baseUrl, model, extraNotes } = req.body || {}
    if (!homeworkId) return fail(res, 40000, '缺少所属作业')

    const homework = await Homework.findByPk(homeworkId)
    if (!homework) return fail(res, 40400, '作业不存在')

    // 取该作业题目（按布置顺序，与打印/导出顺序一致）
    const links = await HomeworkQuestion.findAll({
      where: { homeworkId },
      order: [
        ['sort', 'ASC'],
        ['id', 'ASC']
      ]
    })
    const ids = links.map((l) => l.questionId)
    const rows = ids.length ? await Question.findAll({ where: { id: ids } }) : []
    const map = new Map(rows.map((q) => [q.id, q]))
    const ordered = ids.map((id) => map.get(id)).filter(Boolean)

    let studentName = ''
    if (studentId) {
      const st = await Student.findByPk(studentId)
      studentName = st?.name || ''
    }

    const TYPE_TEXT = { choice: '选择题', fill: '填空题', solve: '解答题' }
    const list = ordered
      .map((q, i) => {
        const tag = [q.knowledgeTag, q.knowledgeSubTag].filter(Boolean).join(' / ')
        const typeText = TYPE_TEXT[q.type] || q.type || ''
        const title = plainText(q.title).slice(0, 120)
        return `${i + 1}. 【${typeText}】${tag ? tag + '｜' : ''}${title}`
      })
      .join('\n')

    const userContent = [
      `作业标题：${homework.title || '（未命名）'}`,
      `题目数量：${ordered.length}`,
      studentName ? `学生：${studentName}` : '',
      extraNotes ? `老师补充说明：${String(extraNotes).slice(0, 500)}` : '',
      '',
      '本次作业题目清单：',
      list || '（该作业暂无题目）'
    ]
      .filter(Boolean)
      .join('\n')

    const target = resolveAiTarget({ apiKey, baseUrl, model })
    if (target.error) return fail(res, 40000, target.error)
    targetBase = target.base

    const raw = await callChat({
      ...target,
      temperature: 0.4,
      messages: [
        { role: 'system', content: LESSON_PROMPT },
        { role: 'user', content: userContent }
      ]
    })

    ok(res, parseLessonJson(raw), '生成完成')
  } catch (e) {
    replyAiError(res, next, e, targetBase)
  }
}
