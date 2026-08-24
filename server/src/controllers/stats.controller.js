// 首页统计控制器
const { Op } = require('sequelize')
const { Question, Student, Homework, Submission } = require('../models')
const { ok } = require('../utils/response')
const { cacheGet, cacheSet } = require('../utils/cache')

// 统计接口聚合多张表，结果变化不频繁，加短 TTL 缓存降低数据库压力
const STATS_TTL = 10000

exports.overview = async (req, res, next) => {
  try {
    const cacheKey = 'stats:overview'
    const cached = cacheGet(cacheKey)
    if (cached) return ok(res, cached)

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

    const payload = {
      counts: { questionCount, studentCount, homeworkCount, submissionCount },
      byType,
      byDifficulty,
      byKnowledge
    }
    cacheSet(cacheKey, payload, STATS_TTL)
    ok(res, payload)
  } catch (e) {
    next(e)
  }
}
