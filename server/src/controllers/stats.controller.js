// 首页统计控制器
const { Op } = require('sequelize')
const { Question, Student, Homework, Submission } = require('../models')
const { ok } = require('../utils/response')

exports.overview = async (req, res, next) => {
  try {
    const [questionCount, studentCount, homeworkCount, submissionCount] = await Promise.all([
      Question.count(),
      Student.count(),
      Homework.count(),
      Submission.count()
    ])

    // 题型分布
    const byType = await Question.findAll({
      attributes: ['type', [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count']],
      group: ['type'],
      raw: true
    })

    // 难度分布
    const byDifficulty = await Question.findAll({
      attributes: ['difficulty', [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count']],
      group: ['difficulty'],
      raw: true
    })

    // 知识点分布（按数量取前 10）
    const byKnowledge = await Question.findAll({
      attributes: ['knowledgeTag', [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count']],
      where: { knowledgeTag: { [Op.ne]: null, [Op.ne]: '' } },
      group: ['knowledgeTag'],
      order: [[Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    })

    ok(res, {
      counts: { questionCount, studentCount, homeworkCount, submissionCount },
      byType,
      byDifficulty,
      byKnowledge
    })
  } catch (e) {
    next(e)
  }
}
