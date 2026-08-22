// 路由汇总挂载（新增模块在此追加一行）
const router = require('express').Router()

router.use('/students', require('./student.routes'))
router.use('/questions', require('./question.routes'))
router.use('/homeworks', require('./homework.routes'))
router.use('/upload', require('./upload.routes'))

module.exports = router
