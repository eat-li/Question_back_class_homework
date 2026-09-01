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

function unauth(res) {
  return res.status(401).json({
    code: 40100,
    message: '请先登录',
    data: null
  })
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verify(token)
  if (!payload) return unauth(res)
  req.auth = payload
  next()
}

/**
 * 只读接口鉴权（供小程序等外部只读端使用）
 *
 * 与 requireAuth 的区别：
 * 1. 挂在 /api/open 前缀下，只暴露查询类接口，写接口根本不在该路由组内；
 * 2. 中间件层二次强制「只允许 GET/HEAD」，即使将来误挂了写接口也改不了数据。
 *
 * 这样即便访客令牌被反编译拿到，最坏结果也只是「读走题库」，无法增删改。
 */
function requireReadonly(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ code: 40500, message: '只读接口不支持该操作', data: null })
  }
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verify(token)
  if (!payload) return unauth(res)
  req.auth = payload
  next()
}

module.exports = { sign, verify, requireAuth, requireReadonly }
