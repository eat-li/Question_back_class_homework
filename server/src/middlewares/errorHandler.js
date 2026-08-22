// 全局错误处理中间件
module.exports = (err, req, res, next) => {
  console.error('[Error]', err)
  res.status(500).json({
    code: 50000,
    message: err.message || '服务器内部错误',
    data: null
  })
}
