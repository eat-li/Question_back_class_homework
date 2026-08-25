// 管理员登录认证：基于 HMAC 签名的 Token，不依赖额外 npm 包
const crypto = require('crypto')

const SECRET = process.env.AUTH_SECRET || 'dev-only-change-me'

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${signature}`
}

function verify(token) {
  if (!token) return null
  try {
    const [data, signature] = token.split('.')
    if (!data || !signature) return null

    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verify(token)
  if (!payload) {
    return res.status(401).json({
      code: 40100,
      message: '请先登录',
      data: null
    })
  }
  req.auth = payload
  next()
}

module.exports = { sign, verify, requireAuth }
