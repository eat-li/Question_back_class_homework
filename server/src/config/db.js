// Sequelize 连接配置
const { Sequelize } = require('sequelize')
require('dotenv').config()

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    dialectOptions: {
      charset: 'utf8mb4' // 确保中文正常存取
    },
    define: {
      underscored: true, // 字段 camelCase -> 列 snake_case
      freezeTableName: true
    }
  }
)

module.exports = sequelize
