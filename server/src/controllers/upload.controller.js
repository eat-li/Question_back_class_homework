// 图片上传控制器：接收文件流并上传到阿里云 OSS，返回可公开访问的 URL
const crypto = require('crypto')
const { client, BASE_URL } = require('../config/oss')
const { ok, fail } = require('../utils/response')

// 允许的图片类型 -> 扩展名
const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
}

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 40000, '未接收到文件')

    const ext = ALLOWED[req.file.mimetype]
    if (!ext) return fail(res, 40000, '仅支持 jpg / png / gif / webp 图片')

    // 按日期分目录 + 唯一文件名，避免重名覆盖
    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
    const key = `questions/${day}/${crypto.randomUUID()}${ext}`

    await client.put(key, req.file.buffer, { mime: req.file.mimetype })

    const url = `${BASE_URL}/${key}`
    ok(res, { url, key }, '上传成功')
  } catch (e) {
    next(e)
  }
}
