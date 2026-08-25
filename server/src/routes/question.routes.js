// 题库路由
const router = require('express').Router()
const c = require('../controllers/question.controller')

router.get('/', c.list)
router.get('/tags', c.tags)
router.get('/stats', c.stats)
router.post('/', c.create)
router.get('/:id', c.get)
router.patch('/:id', c.update)
router.delete('/:id', c.remove)

module.exports = router
