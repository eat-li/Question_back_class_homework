// 数据备份路由
const router = require('express').Router()
const c = require('../controllers/backup.controller')

router.get('/', c.export)

module.exports = router
