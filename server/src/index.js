// 服务入口
require('dotenv').config()
const app = require('./app')
const { sequelize } = require('./models')
const { runMigrations } = require('./utils/migrate')
const { ensureIndexes } = require('./utils/ensureIndexes')
const { assertAuthSecretConfigured } = require('./middlewares/auth')

const PORT = process.env.PORT || 3000

assertAuthSecretConfigured()

sequelize
  .authenticate()
  // sync() 只负责“创建缺失的表”，不再自动 alter 已有表结构；
  // 后续表结构变更统一通过 server/migrations 下的迁移文件管理。
  .then(() => sequelize.sync())
  .then(() => runMigrations(sequelize))
  .then(() => ensureIndexes(sequelize))
  .then(() => {
    app.listen(PORT, () => console.log(`✅ 服务已启动: http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('❌ 数据库连接失败:', err.message)
    process.exit(1)
  })
