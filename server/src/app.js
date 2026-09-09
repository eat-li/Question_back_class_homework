// Express 应用装配
const express = require('express')
const cors = require('cors')
const path = require('path')
const routes = require('./routes')
const errorHandler = require('./middlewares/errorHandler')

const isProd = process.env.NODE_ENV === 'production'
const defaultCorsOrigins = isProd ? 'http://localhost:5173' : '*'
const corsOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = express()

// CORS：生产环境默认只允许本机前端，可通过 CORS_ORIGINS 配置多个来源
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        return callback(null, true)
      }
      const error = new Error('CORS origin not allowed')
      error.status = 403
      return callback(error)
    }
  })
)

// 基础安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-XSS-Protection', '0')
  next()
})

// 简单请求日志
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`)
  })
  next()
})

// 简单内存限流：生产环境默认开启，也可用 RATE_LIMIT_ENABLED=true 手动开启
const rateLimitEnabled = isProd || process.env.RATE_LIMIT_ENABLED === 'true'
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000
const RATE_MAX = Number(process.env.RATE_LIMIT_MAX) || 300
if (rateLimitEnabled) {
  const rateMap = new Map()
  setInterval(() => {
    for (const [key, value] of rateMap) {
      if (Date.now() > value.resetAt) rateMap.delete(key)
    }
  }, RATE_WINDOW_MS).unref()

  app.use((req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const hit = rateMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS }
    if (now > hit.resetAt) {
      hit.count = 0
      hit.resetAt = now + RATE_WINDOW_MS
    }
    hit.count++
    rateMap.set(ip, hit)
    if (hit.count > RATE_MAX) {
      return res.status(429).json({
        code: 42900,
        message: '请求过于频繁，请稍后再试',
        data: null
      })
    }
    next()
  })
}

// 题干为富文本 HTML，图片走 OSS 不再 base64，保持较小限制即可
app.use(express.json({ limit: '2mb' }))

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 0, message: 'ok', data: { status: 'up' } }))

// KaTeX 字体（小程序公式渲染用）
// 必须公开，不能挂在 requireAuth 下面：
// uni.loadFontFace / @font-face 发起的请求不会带 Authorization 头
app.use(
  '/katex-fonts',
  express.static(path.join(__dirname, '../public/katex-fonts'), {
    maxAge: '30d',
    setHeaders(res) {
      // 小程序端字体请求来自不同源，需要显式放开
      res.setHeader('Access-Control-Allow-Origin', '*')
    }
  })
)

// 业务路由
app.use('/api', routes)

app.use(errorHandler)

module.exports = app
