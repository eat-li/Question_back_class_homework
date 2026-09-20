// AI 功能路由
const router = require('express').Router()
const c = require('../controllers/ai.controller')

router.get('/config', c.config)
router.post('/format', c.format)
router.post('/lesson-summary', c.lessonSummary)

module.exports = router
