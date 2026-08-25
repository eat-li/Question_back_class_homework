// 作业模型
module.exports = (sequelize, DataTypes) =>
  sequelize.define('homework', {
    title: { type: DataTypes.STRING(200), allowNull: false, comment: '作业标题' },
    startAt: { type: DataTypes.DATE, comment: '开始时间' },
    endAt: { type: DataTypes.DATE, comment: '截止时间' },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'closed'),
      defaultValue: 'draft',
      comment: '状态'
    },
    remark: { type: DataTypes.TEXT, comment: '备注' }
  })
