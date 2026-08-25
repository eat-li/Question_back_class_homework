// 统一响应包络 { code, message, data }
const ok = (res, data = null, message = 'ok') => res.json({ code: 0, message, data })

const fail = (res, code = 50000, message = 'error') => res.json({ code, message, data: null })

module.exports = { ok, fail }
