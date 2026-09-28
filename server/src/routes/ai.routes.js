// AI 功能路由
const router = require('express').Router()
const c = require('../controllers/ai.controller')

router.get('/config', c.config)
router.post('/format', c.format)
router.post('/answer', c.generateAnswer)
router.post('/lesson-summary', c.lessonSummary)
router.post('/conclusion', c.generateConclusion)
// 流式版本：边生成边回传（SSE），避免长内容生成因整段超时而失败
router.post('/conclusion/stream', c.generateConclusionStream)

module.exports = router
