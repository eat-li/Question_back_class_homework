// AI 功能路由
const router = require('express').Router()
const c = require('../controllers/ai.controller')

router.post('/format', c.format)

module.exports = router
