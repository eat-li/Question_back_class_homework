// 题目模型
module.exports = (sequelize, DataTypes) =>
  sequelize.define('question', {
    title: { type: DataTypes.TEXT, allowNull: false, comment: '题干(富文本HTML)' },
    type: { type: DataTypes.ENUM('choice', 'fill', 'solve'), defaultValue: 'choice', comment: '题型' },
    difficulty: { type: DataTypes.INTEGER, defaultValue: 3, comment: '难度 1-5' },
    knowledgeTag: { type: DataTypes.STRING(100), comment: '知识点标签' },
    body: { type: DataTypes.TEXT, comment: '补充说明(富文本/LaTeX)' },
    options: { type: DataTypes.JSON, comment: '选项(客观题)' },
    answer: { type: DataTypes.TEXT, comment: '答案与解析(富文本HTML，可含图片)' }
  })
