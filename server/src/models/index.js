// 模型注册与关联
const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

const Student = require('./Student')(sequelize, DataTypes)
const Question = require('./Question')(sequelize, DataTypes)
const Homework = require('./Homework')(sequelize, DataTypes)
const HomeworkQuestion = require('./HomeworkQuestion')(sequelize, DataTypes)
const HomeworkStudent = require('./HomeworkStudent')(sequelize, DataTypes)
const Submission = require('./Submission')(sequelize, DataTypes)
const ExamScore = require('./ExamScore')(sequelize, DataTypes)
const KnowledgeCategory = require('./KnowledgeCategory')(sequelize, DataTypes)
const Conclusion = require('./Conclusion')(sequelize, DataTypes)
const LessonSummary = require('./LessonSummary')(sequelize, DataTypes)

// 学生 1—* 提交
Student.hasMany(Submission, { foreignKey: 'studentId' })
Submission.belongsTo(Student, { foreignKey: 'studentId' })

// 作业 1—* 提交
Homework.hasMany(Submission, { foreignKey: 'homeworkId' })
Submission.belongsTo(Homework, { foreignKey: 'homeworkId' })

// 作业 1—* 作业题目（多对多关联表）
Homework.hasMany(HomeworkQuestion, {
  foreignKey: 'homeworkId',
  as: 'homeworkQuestions',
  onDelete: 'CASCADE'
})
HomeworkQuestion.belongsTo(Homework, { foreignKey: 'homeworkId', as: 'homework' })
HomeworkQuestion.belongsTo(Question, { foreignKey: 'questionId', as: 'question' })

// 作业 1—* 作业学生（多对多关联表）
Homework.hasMany(HomeworkStudent, {
  foreignKey: 'homeworkId',
  as: 'homeworkStudents',
  onDelete: 'CASCADE'
})
HomeworkStudent.belongsTo(Homework, { foreignKey: 'homeworkId', as: 'homework' })
HomeworkStudent.belongsTo(Student, { foreignKey: 'studentId', as: 'student' })

// 学生 1—* 测评成绩
Student.hasMany(ExamScore, { foreignKey: 'studentId' })
ExamScore.belongsTo(Student, { foreignKey: 'studentId' })

// 知识点分类 1—* 结论
KnowledgeCategory.hasMany(Conclusion, { foreignKey: 'categoryId', as: 'conclusions' })
Conclusion.belongsTo(KnowledgeCategory, { foreignKey: 'categoryId', as: 'category' })

// 作业 1—* 课时总结；学生 1—* 课时总结
Homework.hasMany(LessonSummary, { foreignKey: 'homeworkId', as: 'lessonSummaries' })
LessonSummary.belongsTo(Homework, { foreignKey: 'homeworkId', as: 'homework' })
Student.hasMany(LessonSummary, { foreignKey: 'studentId', as: 'lessonSummaries' })
LessonSummary.belongsTo(Student, { foreignKey: 'studentId', as: 'student' })

module.exports = {
  sequelize,
  Student,
  Question,
  Homework,
  HomeworkQuestion,
  HomeworkStudent,
  Submission,
  ExamScore,
  KnowledgeCategory,
  Conclusion,
  LessonSummary
}
