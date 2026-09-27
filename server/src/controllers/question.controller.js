// 题库控制器
const { Op } = require('sequelize')
const { sequelize, Question, HomeworkQuestion } = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache')

// 知识点标签变化不频繁，加短 TTL 缓存
const TAGS_TTL = 10000
const DEFAULT_LIST_LIMIT = Number(process.env.DEFAULT_LIST_LIMIT) || 1000

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

// 列表（关键词/题型/难度/知识点/二级知识点/按 id 批量检索，支持分页）
exports.list = async (req, res, next) => {
  try {
    const { keyword, type, difficulty, knowledgeTag, knowledgeSubTag, ids, page, pageSize } =
      req.query
    const where = {}
    if (keyword) where.title = { [Op.like]: `%${keyword}%` }
    if (type) where.type = type
    if (difficulty) where.difficulty = Number(difficulty)
    // 按 id 批量取（如 ids=3,7,9）：用于查看已选题目并调整顺序
    if (ids !== undefined) {
      const idList = String(ids)
        .split(',')
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0)
      where.id = { [Op.in]: idList.length ? idList : [-1] }
    }
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

    const list = await Question.findAll({ where, order, limit: DEFAULT_LIST_LIMIT })
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

    // 删题目要一并清掉作业-题目关联：homework_questions.questionId 是非空外键，
    // 库里没开外键校验（外包 MySQL 常见）时裸删会留下孤儿行，之后导出的备份
    // 换到有外键的库恢复就会整包失败。顺手把影响面告诉老师，避免静默改动作业。
    let removedLinks = 0
    await sequelize.transaction(async (t) => {
      removedLinks = await HomeworkQuestion.destroy({
        where: { questionId: question.id },
        transaction: t
      })
      await question.destroy({ transaction: t })
    })

    cacheDel('questions:tags')
    cacheDel('stats:overview')
    ok(res, null, removedLinks ? `删除成功，同时从 ${removedLinks} 份作业中移除了该题` : '删除成功')
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

// 编辑二级知识点：重命名 / 合并到已有二级知识点 / 移回未分类（删除），
// 并可选择同时更换它所属的一级知识点（即整组题目换题库）。
//
// 二级知识点是以题目上的字符串 knowledgeSubTag 聚合出来的，没有独立表，
// 因此「编辑二级知识点」= 批量更新其下所有题目的 knowledgeSubTag。
//
// 参数：
//   from           原二级知识点名称（必填）
//   to             新名称；不传 = 不改名称；传空串 / null = 移回未分类（等效删除该二级知识点）
//   knowledgeTag   限定作用的一级知识点；'__empty__' 表示未分类题库；不传 = 全部题库
//   toKnowledgeTag 同时更换所属一级知识点；传 null/'' 表示改为未分类；不传 = 不更换
exports.updateSubTag = async (req, res, next) => {
  try {
    const { from, to, knowledgeTag, toKnowledgeTag } = req.body || {}

    const fromName = from == null ? '' : String(from).trim()
    if (!fromName) return fail(res, 40000, '原二级知识点名称不能为空')

    // 改名与换归属各自独立：只有显式传了该字段才动它，
    // 否则「只想换题库」的调用会把二级知识点顺手清空。
    const renameSub = to !== undefined
    const toName = to == null ? '' : String(to).trim()
    if (toName.length > 100) return fail(res, 40000, '二级知识点名称不能超过 100 字')

    const moveParent = toKnowledgeTag !== undefined
    const parentName = toKnowledgeTag == null ? '' : String(toKnowledgeTag).trim()
    if (parentName.length > 100) return fail(res, 40000, '一级知识点名称不能超过 100 字')

    if (!renameSub && !moveParent) {
      return ok(res, { updated: 0, cleared: false }, '没有需要修改的内容')
    }
    if (renameSub && toName === fromName && !moveParent) {
      return ok(res, { updated: 0, cleared: false }, '名称未变化')
    }

    const where = { knowledgeSubTag: fromName }
    if (knowledgeTag === '__empty__') {
      where.knowledgeTag = { [Op.or]: [null, ''] }
    } else if (knowledgeTag != null && String(knowledgeTag) !== '') {
      where.knowledgeTag = String(knowledgeTag)
    }

    // 先统计匹配题量：MySQL 的 UPDATE 只返回「实际发生变化」的行数，
    // 若新值与旧值相同行数会是 0，直接用它报数会误报成「未找到」。
    const matched = await Question.count({ where })
    if (!matched) {
      return ok(res, { updated: 0, cleared: false }, `未找到二级知识点「${fromName}」`)
    }

    const payload = {}
    if (renameSub) payload.knowledgeSubTag = toName || null
    if (moveParent) payload.knowledgeTag = parentName || null

    await Question.update(payload, { where })
    cacheDel('questions:tags')
    cacheDel('stats:overview')

    const target = moveParent ? `题库「${parentName || '未分类'}」` : ''
    let message
    if (renameSub && !toName) {
      message = `已删除二级知识点「${fromName}」，${matched} 道题移回未分类`
    } else if (renameSub && moveParent) {
      message = `已将「${fromName}」更新为「${toName}」并移入${target}，共 ${matched} 道题`
    } else if (renameSub) {
      message = `已将「${fromName}」更新为「${toName}」，共 ${matched} 道题`
    } else {
      message = `已将二级知识点「${fromName}」移入${target}，共 ${matched} 道题`
    }

    ok(res, { updated: matched, cleared: renameSub && !toName }, message)
  } catch (e) {
    next(e)
  }
}
