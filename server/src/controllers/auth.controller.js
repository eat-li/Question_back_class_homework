// 管理员登录控制器
const crypto = require('crypto')
const { ok, fail } = require('../utils/response')
const { sign } = require('../middlewares/auth')

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 天

function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {}

    const adminUsername = process.env.ADMIN_USERNAME || ''
    const adminPassword = process.env.ADMIN_PASSWORD || ''

    if (!adminUsername || !adminPassword) {
      return fail(
        res,
        50000,
        '服务端未配置管理员账号，请在 server/.env 中设置 ADMIN_USERNAME 和 ADMIN_PASSWORD'
      )
    }

    if (!safeEqual(username, adminUsername) || !safeEqual(password, adminPassword)) {
      return fail(res, 40100, '用户名或密码错误')
    }

    const token = sign({
      username: adminUsername,
      exp: Date.now() + TOKEN_TTL_MS
    })

    ok(res, { token, username: adminUsername }, '登录成功')
  } catch (e) {
    next(e)
  }
}

exports.me = async (req, res, next) => {
  try {
    ok(res, { username: req.auth?.username || '' })
  } catch (e) {
    next(e)
  }
}
