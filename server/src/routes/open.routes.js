// 只读开放接口（小程序 / 家长端使用）
//
// 设计要点：
// 1. 整组挂在 requireReadonly 之下，中间件强制 GET/HEAD，写操作在入口就被拒；
// 2. 这里只登记查询类 handler，不复用 question.routes，避免误把 POST/PATCH/DELETE 暴露出去；
// 3. 返回的题目字段在控制器出口做裁剪，不输出内部字段。
const router = require('express').Router()
const c = require('../controllers/question.controller')
const { requireReadonly } = require('../middlewares/auth')

router.use(requireReadonly)

router.get('/questions', c.list)
router.get('/questions/tags', c.tags)
router.get('/questions/subtags', c.subTags)
router.get('/questions/stats', c.stats)
router.get('/questions/:id', c.get)

module.exports = router
