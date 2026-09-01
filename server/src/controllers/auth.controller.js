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

// 访客（小程序端）登录：签发只读令牌，不带任何管理员权限。
// 若配置了 GUEST_CODE，则需传入正确访问码；未配置时对只读接口开放。
// 令牌本身可在 /api/open/* 下使用，而该路由组在中间件层强制只允许 GET/HEAD，
// 因此访客无法新增、修改或删除任何数据。
const GUEST_TOKEN_TTL_MS = Number(process.env.GUEST_TOKEN_TTL_MS) || 7 * 24 * 60 * 60 * 1000

exports.guest = async (req, res, next) => {
  try {
    const guestCode = process.env.GUEST_CODE || ''
    if (guestCode) {
      const { code } = req.body || {}
      if (!safeEqual(code == null ? '' : String(code), guestCode)) {
        return fail(res, 40100, '访问码不正确')
      }
    }

    const token = sign({ scope: 'guest', exp: Date.now() + GUEST_TOKEN_TTL_MS })
    ok(res, { token, scope: 'guest', exp: Date.now() + GUEST_TOKEN_TTL_MS })
  } catch (e) {
    next(e)
  }
}
