// 服务入口
require('dotenv').config()
const app = require('./app')
const { sequelize } = require('./models')
const { runMigrations } = require('./utils/migrate')
const { ensureIndexes } = require('./utils/ensureIndexes')
const { assertAuthSecretConfigured } = require('./middlewares/auth')

const PORT = process.env.PORT || 3000

// 数据库在远程主机时每条 SQL 都要一次网络往返（实测 ~43ms），
// 启动阶段必须尽量少发查询，否则启动要好几秒：
//   DB_SYNC            auto(默认)=缺表才建 | true=总是 sync | false=跳过
//   DB_ENSURE_INDEXES  true 才在启动时补建索引（默认关闭；索引统一由迁移 001 管理）
const SYNC_MODE = String(process.env.DB_SYNC || 'auto').toLowerCase()
const ENSURE_INDEXES = String(process.env.DB_ENSURE_INDEXES || '').toLowerCase() === 'true'

assertAuthSecretConfigured()

// sequelize.sync() 会逐张表发查询检查（10 张表 ≈ 1.2s）。
// 这里先用一次 SHOW TABLES 与模型比对：表齐全就直接跳过，缺表才真正建表。
async function ensureSchema() {
  if (SYNC_MODE === 'false') return
  if (SYNC_MODE === 'true') return sequelize.sync()

  const [rows] = await sequelize.query('SHOW TABLES')
  const existing = new Set(rows.map((r) => String(Object.values(r)[0])))
  const missing = Object.values(sequelize.models).filter(
    (m) => !existing.has(String(m.getTableName()))
  )
  if (!missing.length) return

  console.log(`ℹ️  检测到缺失的表，正在创建: ${missing.map((m) => m.getTableName()).join(', ')}`)
  await sequelize.sync()
}

const startedAt = Date.now()

sequelize
  .authenticate()
  .then(() => ensureSchema())
  .then(() => runMigrations(sequelize))
  // 索引由迁移 001 负责创建；启动时默认不再重复尝试，
  // 否则每次启动都要发 20+ 条必然失败的 CREATE INDEX（含重试，可占 5s 以上）
  .then(() => (ENSURE_INDEXES ? ensureIndexes(sequelize) : undefined))
  .then(() => {
    app.listen(PORT, () =>
      console.log(`✅ 服务已启动: http://localhost:${PORT}（耗时 ${Date.now() - startedAt} ms）`)
    )
  })
  .catch((err) => {
    console.error('❌ 数据库连接失败:', err.message)
    process.exit(1)
  })
