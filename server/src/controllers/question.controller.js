// 题库控制器
const { Op } = require('sequelize')
const { Question } = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache')

// 知识点标签变化不频繁，加短 TTL 缓存
const TAGS_TTL = 10000

const TYPES = ['choice', 'fill', 'solve']

// 字段白名单：只允许写入题目模型允许的字段
const pick = (body = {}) => {
  const out = {}
  if (body.title !== undefined) out.title = String(body.title)
  if (body.type !== undefined) out.type = body.type
  if (body.difficulty !== undefined)
    out.difficulty =
      body.difficulty === null || body.difficulty === '' ? null : Number(body.difficulty)
  if (body.knowledgeTag !== undefined)
    out.knowledgeTag = body.knowledgeTag ? String(body.knowledgeTag).slice(0, 100) : null
  if (body.knowledgeSubTag !== undefined)
    out.knowledgeSubTag = body.knowledgeSubTag ? String(body.knowledgeSubTag).slice(0, 100) : null
  if (body.body !== undefined) out.body = body.body ? String(body.body) : null
  if (body.options !== undefined) out.options = body.options
  if (body.answer !== undefined) out.answer = body.answer ? String(body.answer) : null
  return out
}

const validate = (payload, { partial = false } = {}) => {
  if (payload.title !== undefined && !String(payload.title).trim()) return '题干不能为空'
  if (!partial && (!payload.title || !String(payload.title).trim())) return '题干不能为空'
  if (payload.type !== undefined && !TYPES.includes(payload.type)) return '题型不合法'
  if (payload.difficulty !== undefined && payload.difficulty !== null) {
    const d = Number(payload.difficulty)
    if (!Number.isInteger(d) || d < 1 || d > 5) return '难度需为 1-5 的整数'
  }
  if (
    payload.options !== undefined &&
    payload.options !== null &&
    !Array.isArray(payload.options)
  ) {
    return '选项必须是数组'
  }
  return null
}

// 列表（关键词/题型/难度/知识点/二级知识点检索，支持分页）
exports.list = async (req, res, next) => {
  try {
    const { keyword, type, difficulty, knowledgeTag, knowledgeSubTag, page, pageSize } = req.query
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
    if (knowledgeSubTag === '__empty__') {
      where.knowledgeSubTag = { [Op.or]: [null, ''] }
    } else if (knowledgeSubTag) {
      where.knowledgeSubTag = knowledgeSubTag
    }

    const order = [['id', 'DESC']]

    // 传了 page 才分页；兼容旧调用方（不传 page 时仍返回数组）
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1)
      const size = Math.min(100, Math.max(1, Number(pageSize) || 20))
      const { rows, count } = await Question.findAndCountAll({
        where,
        order,
        limit: size,
        offset: (pageNum - 1) * size
      })
      return ok(res, { list: rows, total: count, page: pageNum, pageSize: size })
    }

    const list = await Question.findAll({ where, order })
    ok(res, list)
  } catch (e) {
    next(e)
  }
}

// 知识点卡片聚合：按一级知识点统计题目总数与各题型数量，并附带二级知识点分布
exports.stats = async (req, res, next) => {
  try {
    const { keyword } = req.query
    const where = {}
    if (keyword) where.title = { [Op.like]: `%${keyword}%` }

    const rows = await Question.findAll({
      attributes: [
        'knowledgeTag',
        'knowledgeSubTag',
        'type',
        [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count']
      ],
      where,
      group: ['knowledgeTag', 'knowledgeSubTag', 'type'],
      raw: true
    })

    const map = new Map()
    for (const r of rows) {
      const rawTag = r.knowledgeTag || '__empty__'
      if (!map.has(rawTag)) {
        map.set(rawTag, {
          tag: rawTag,
          label: r.knowledgeTag || '未分类',
          total: 0,
          choice: 0,
          fill: 0,
          solve: 0,
          subTags: []
        })
      }
      const item = map.get(rawTag)
      const count = Number(r.count) || 0
      item.total += count
      if (r.type === 'choice') item.choice += count
      else if (r.type === 'fill') item.fill += count
      else if (r.type === 'solve') item.solve += count

      // 二级知识点分布（仅统计有值的）
      if (r.knowledgeSubTag) {
        const sub = item.subTags.find((s) => s.name === r.knowledgeSubTag)
        if (sub) sub.total += count
        else item.subTags.push({ name: r.knowledgeSubTag, total: count })
      }
    }

    for (const item of map.values()) {
      item.subTags.sort((a, b) => b.total - a.total)
    }

    const stats = [...map.values()].sort((a, b) => b.total - a.total)
    ok(res, stats)
  } catch (e) {
    next(e)
  }
}

// 某一级知识点下的二级知识点列表（带题量，供筛选与级联下拉使用）
exports.subTags = async (req, res, next) => {
  try {
    const { knowledgeTag } = req.query
    const where = { knowledgeSubTag: { [Op.ne]: null, [Op.ne]: '' } }
    if (knowledgeTag === '__empty__') {
      where.knowledgeTag = { [Op.or]: [null, ''] }
    } else if (knowledgeTag) {
      where.knowledgeTag = knowledgeTag
    } else {
      // 未指定一级知识点：统计全部二级知识点（一般不会用到）
    }

    const rows = await Question.findAll({
      attributes: [
        'knowledgeSubTag',
        [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count']
      ],
      where,
      group: ['knowledgeSubTag'],
      order: [[Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'DESC']],
      raw: true
    })
    const subs = rows.map((r) => ({ name: r.knowledgeSubTag, total: Number(r.count) || 0 }))
    ok(res, subs)
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
    const payload = pick(req.body)
    const err = validate(payload)
    if (err) return fail(res, 40000, err)
    if (payload.title !== undefined) payload.title = payload.title.trim()
    if (payload.difficulty !== undefined && payload.difficulty !== null)
      payload.difficulty = Number(payload.difficulty)
    const question = await Question.create(payload)
    cacheDel('questions:tags')
    cacheDel('stats:overview')
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
    const payload = pick(req.body)
    const err = validate(payload, { partial: true })
    if (err) return fail(res, 40000, err)
    if (payload.title !== undefined) payload.title = payload.title.trim()
    if (payload.difficulty !== undefined && payload.difficulty !== null)
      payload.difficulty = Number(payload.difficulty)
    await question.update(payload)
    cacheDel('questions:tags')
    cacheDel('stats:overview')
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
    cacheDel('questions:tags')
    cacheDel('stats:overview')
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}

// 重命名一级知识点（题库名）：把该知识点下所有题目的 knowledgeTag 更新为新名称。
// 二级知识点（knowledgeSubTag）随题目一起保留，不做改动。
exports.renameTag = async (req, res, next) => {
  try {
    const { from, to } = req.body || {}
    const fromName = from == null ? '' : String(from).trim()
    const toName = to == null ? '' : String(to).trim()
    if (!fromName) return fail(res, 40000, '原知识点名称不能为空')
    if (!toName) return fail(res, 40000, '新知识点名称不能为空')
    if (toName.length > 100) return fail(res, 40000, '知识点名称不能超过 100 字')
    if (fromName === toName) return ok(res, { updated: 0 }, '名称未变化')

    const [affectedCount] = await Question.update(
      { knowledgeTag: toName },
      { where: { knowledgeTag: fromName } }
    )
    cacheDel('questions:tags')
    cacheDel('stats:overview')
    ok(res, { updated: affectedCount }, `已更新 ${affectedCount} 道题目`)
  } catch (e) {
    next(e)
  }
}
