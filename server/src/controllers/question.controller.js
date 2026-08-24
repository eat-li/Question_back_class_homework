// 题库控制器
const { Op } = require('sequelize')
const { Question } = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheGet, cacheSet } = require('../utils/cache')

// 知识点标签变化不频繁，加短 TTL 缓存
const TAGS_TTL = 10000

// 列表（关键词/题型/难度/知识点检索）
exports.list = async (req, res, next) => {
  try {
    const { keyword, type, difficulty, knowledgeTag } = req.query
    const where = {}
    if (keyword) where.title = { [Op.like]: `%${keyword}%` }
    if (type) where.type = type
    if (difficulty) where.difficulty = Number(difficulty)
    if (knowledgeTag === '__empty__') {
      // 约定值：筛选「未分类」题目（知识点为空）
      where.knowledgeTag = { [Op.or]: [null, ''] }
    } else if (knowledgeTag) {
      where.knowledgeTag = knowledgeTag
    }
    const list = await Question.findAll({ where, order: [['id', 'DESC']] })
    ok(res, list)
  } catch (e) {
    next(e)
  }
}

// 知识点标签列表（去重，供筛选下拉使用）
exports.tags = async (req, res, next) => {
  try {
    const cacheKey = 'questions:tags'
    const cached = cacheGet(cacheKey)
    if (cached) return ok(res, cached)

    const rows = await Question.findAll({
      attributes: ['knowledgeTag'],
      where: { knowledgeTag: { [Op.ne]: null, [Op.ne]: '' } },
      group: ['knowledgeTag'],
      order: [['knowledgeTag', 'ASC']]
    })
    const tags = rows.map((r) => r.knowledgeTag).filter(Boolean)
    cacheSet(cacheKey, tags, TAGS_TTL)
    ok(res, tags)
  } catch (e) {
    next(e)
  }
}

exports.create = async (req, res, next) => {
  try {
    const question = await Question.create(req.body)
    ok(res, question, '创建成功')
  } catch (e) {
    next(e)
  }
}

exports.get = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id)
    if (!question) return fail(res, 40400, '题目不存在')
    ok(res, question)
  } catch (e) {
    next(e)
  }
}

exports.update = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id)
    if (!question) return fail(res, 40400, '题目不存在')
    await question.update(req.body)
    ok(res, question, '更新成功')
  } catch (e) {
    next(e)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id)
    if (!question) return fail(res, 40400, '题目不存在')
    await question.destroy()
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}
