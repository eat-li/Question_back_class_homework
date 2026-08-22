// 路由汇总挂载（新增模块在此追加一行）
const router = require('express').Router()

router.use('/students', require('./student.routes'))
router.use('/questions', require('./question.routes'))
router.use('/homeworks', require('./homework.routes'))
router.use('/upload', require('./upload.routes'))
router.use('/backup', require('./backup.routes'))
router.use('/stats', require('./stats.routes'))
router.use('/ai', require('./ai.routes'))

module.exports = router
