// 管理员认证模块单元测试（使用 Node 内置测试框架，无需额外依赖）
const test = require('node:test')
const assert = require('node:assert')
const { sign, verify, assertAuthSecretConfigured } = require('../src/middlewares/auth')

test('sign 生成的 token 可以被 verify 正确解析', () => {
  const token = sign({ username: 'admin', exp: Date.now() + 10000 })
  const payload = verify(token)
  assert.ok(payload)
  assert.equal(payload.username, 'admin')
})

test('过期 token 会被拒绝', () => {
  const token = sign({ username: 'admin', exp: Date.now() - 1000 })
  assert.equal(verify(token), null)
})

test('被篡改的 token 会被拒绝', () => {
  const token = sign({ username: 'admin', exp: Date.now() + 10000 })
  const tampered = token.slice(0, -2) + 'xx'
  assert.equal(verify(tampered), null)
})

test('生产环境缺少 AUTH_SECRET 时拒绝启动', () => {
  const oldEnv = process.env.NODE_ENV
  const oldSecret = process.env.AUTH_SECRET
  process.env.NODE_ENV = 'production'
  delete process.env.AUTH_SECRET
  try {
    assert.throws(() => assertAuthSecretConfigured(), /生产环境必须配置 AUTH_SECRET/)
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnv
    if (oldSecret === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = oldSecret
  }
})

test('生产环境配置 AUTH_SECRET 后允许启动', () => {
  const oldEnv = process.env.NODE_ENV
  const oldSecret = process.env.AUTH_SECRET
  process.env.NODE_ENV = 'production'
  process.env.AUTH_SECRET = 'test-secret-for-production'
  try {
    assert.doesNotThrow(() => assertAuthSecretConfigured())
  } finally {
    if (oldEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnv
    if (oldSecret === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = oldSecret
  }
})
