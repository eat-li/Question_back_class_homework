// 管理员认证路由
const router = require('express').Router()
const c = require('../controllers/auth.controller')
const { requireAuth } = require('../middlewares/auth')

router.post('/login', c.login)
router.get('/me', requireAuth, c.me)

module.exports = router
