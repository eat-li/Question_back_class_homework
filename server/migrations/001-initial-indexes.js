// 初始索引迁移：把原先启动时 ensureIndexes 创建的索引纳入迁移管理。
// 该迁移是幂等的：索引已存在时会自动忽略。
const { ensureIndexes } = require('../src/utils/ensureIndexes')

module.exports = {
  async up(queryInterface, sequelize) {
    await ensureIndexes(sequelize)
  },

  async down() {
    // 为安全起见，不自动删除索引；如需回滚请手工 DROP INDEX
  }
}
