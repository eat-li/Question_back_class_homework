// 路由汇总挂载（新增模块在此追加一行）
const router = require('express').Router()
const { requireAuth } = require('../middlewares/auth')

// 登录接口公开，其余业务接口都需要登录
router.use('/auth', require('./auth.routes'))
router.use(requireAuth)

router.use('/students', require('./student.routes'))
router.use('/questions', require('./question.routes'))
router.use('/homeworks', require('./homework.routes'))
router.use('/upload', require('./upload.routes'))
router.use('/backup', require('./backup.routes'))
router.use('/stats', require('./stats.routes'))
router.use('/ai', require('./ai.routes'))
router.use('/grades', require('./grade.routes'))
router.use('/categories', require('./category.routes'))
router.use('/conclusions', require('./conclusion.routes'))

module.exports = router
