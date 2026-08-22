// Express 应用装配
const express = require('express')
const cors = require('cors')
const routes = require('./routes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()
app.use(cors())
// 题干为富文本 HTML，图片走 OSS 不再 base64，保持较小限制即可
app.use(express.json({ limit: '2mb' }))

// 健康检查
app.get('/api/health', (req, res) =>
  res.json({ code: 0, message: 'ok', data: { status: 'up' } })
)

// 业务路由
app.use('/api', routes)

app.use(errorHandler)

module.exports = app
