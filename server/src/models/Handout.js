// 讲义模型：内容项以有序 JSON 数组存储（type = question|conclusion|knowledge）
module.exports = (sequelize, DataTypes) =>
  sequelize.define('handout', {
    title: { type: DataTypes.STRING(200), allowNull: false, comment: '讲义标题' },
    status: {
      type: DataTypes.ENUM('draft', 'published'),
      defaultValue: 'published',
      comment: '状态'
    },
    remark: { type: DataTypes.TEXT, comment: '备注' },
    items: {
      type: DataTypes.JSON,
      comment:
        '内容项有序数组 [{ type, id }]，type: question题目 / conclusion结论 / knowledge知识点'
    }
  })
