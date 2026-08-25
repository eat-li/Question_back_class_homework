// 数据备份路由
const router = require('express').Router()
const multer = require('multer')
const c = require('../controllers/backup.controller')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 备份包最大 50MB
})

router.get('/', c.export)
router.post('/restore', upload.single('file'), c.restore)

module.exports = router
