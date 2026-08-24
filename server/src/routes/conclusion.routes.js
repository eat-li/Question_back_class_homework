// 结论路由
const router = require('express').Router()
const c = require('../controllers/conclusion.controller')

router.get('/', c.list)
router.post('/', c.create)
router.get('/:id', c.get)
router.put('/:id', c.update)
router.delete('/:id', c.remove)
router.patch('/:id/status', c.updateStatus)

module.exports = router
