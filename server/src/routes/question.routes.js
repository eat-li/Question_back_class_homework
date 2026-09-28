// 题库路由
const router = require('express').Router()
const c = require('../controllers/question.controller')

router.get('/', c.list)
router.get('/tags', c.tags)
router.get('/subtags', c.subTags)
router.get('/stats', c.stats)
router.patch('/rename-tag', c.renameTag)
router.patch('/update-subtag', c.updateSubTag)
// 设置二级知识点的掌握等级（基础/中等/进阶）——放在 /:id 之前，避免被当成 id 匹配
router.patch('/subtag-level', c.setSubLevel)
router.post('/', c.create)
router.get('/:id', c.get)
router.patch('/:id', c.update)
router.delete('/:id', c.remove)

module.exports = router
