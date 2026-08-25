// 管理员认证模块单元测试（使用 Node 内置测试框架，无需额外依赖）
const test = require('node:test')
const assert = require('node:assert')
const { sign, verify } = require('../src/middlewares/auth')

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
