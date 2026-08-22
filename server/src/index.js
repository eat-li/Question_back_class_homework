// 服务入口
require('dotenv').config()
const app = require('./app')
const { sequelize } = require('./models')

const PORT = process.env.PORT || 3000

sequelize
  .authenticate()
  .then(() => sequelize.sync({ alter: true })) // 开发期自动同步建表/补列
  .then(() => {
    app.listen(PORT, () => console.log(`✅ 服务已启动: http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('❌ 数据库连接失败:', err.message)
    process.exit(1)
  })
