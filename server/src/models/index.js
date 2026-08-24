// 模型注册与关联
const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

const Student = require('./Student')(sequelize, DataTypes)
const Question = require('./Question')(sequelize, DataTypes)
const Homework = require('./Homework')(sequelize, DataTypes)
const Submission = require('./Submission')(sequelize, DataTypes)
const ExamScore = require('./ExamScore')(sequelize, DataTypes)
const KnowledgeCategory = require('./KnowledgeCategory')(sequelize, DataTypes)
const Conclusion = require('./Conclusion')(sequelize, DataTypes)

// 学生 1—* 提交
Student.hasMany(Submission, { foreignKey: 'studentId' })
Submission.belongsTo(Student, { foreignKey: 'studentId' })

// 作业 1—* 提交
Homework.hasMany(Submission, { foreignKey: 'homeworkId' })
Submission.belongsTo(Homework, { foreignKey: 'homeworkId' })

// 学生 1—* 测评成绩
Student.hasMany(ExamScore, { foreignKey: 'studentId' })
ExamScore.belongsTo(Student, { foreignKey: 'studentId' })

// 知识点分类 1—* 结论
KnowledgeCategory.hasMany(Conclusion, { foreignKey: 'categoryId', as: 'conclusions' })
Conclusion.belongsTo(KnowledgeCategory, { foreignKey: 'categoryId', as: 'category' })

module.exports = {
  sequelize,
  Student,
  Question,
  Homework,
  Submission,
  ExamScore,
  KnowledgeCategory,
  Conclusion
}
