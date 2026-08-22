// 模型注册与关联
const sequelize = require('../config/db')
const { DataTypes } = require('sequelize')

const Student = require('./Student')(sequelize, DataTypes)
const Question = require('./Question')(sequelize, DataTypes)
const Homework = require('./Homework')(sequelize, DataTypes)
const Submission = require('./Submission')(sequelize, DataTypes)

// 学生 1—* 提交
Student.hasMany(Submission, { foreignKey: 'studentId' })
Submission.belongsTo(Student, { foreignKey: 'studentId' })

// 作业 1—* 提交
Homework.hasMany(Submission, { foreignKey: 'homeworkId' })
Submission.belongsTo(Homework, { foreignKey: 'homeworkId' })

module.exports = { sequelize, Student, Question, Homework, Submission }
