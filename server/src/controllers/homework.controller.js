// 作业与成绩控制器
const { Op } = require('sequelize')
const {
  sequelize,
  Homework,
  HomeworkQuestion,
  HomeworkStudent,
  Submission,
  Student,
  Question,
  LessonSummary
} = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheDel } = require('../utils/cache')

const STATUSES = ['draft', 'published', 'closed']
const DEFAULT_LIST_LIMIT = Number(process.env.DEFAULT_LIST_LIMIT) || 1000

const normalizeIdArray = (value) => {
  if (value === undefined) return undefined
  if (value === null || !Array.isArray(value)) return null
  return value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
}

const pick = (body = {}) => {
  const out = {}
  if (body.title !== undefined) out.title = String(body.title).slice(0, 200)
  if (body.questionIds !== undefined) out.questionIds = normalizeIdArray(body.questionIds)
  if (body.studentIds !== undefined) out.studentIds = normalizeIdArray(body.studentIds)
  if (body.startAt !== undefined) out.startAt = body.startAt || null
  if (body.endAt !== undefined) out.endAt = body.endAt || null
  if (body.status !== undefined) out.status = body.status
  if (body.remark !== undefined) out.remark = body.remark ? String(body.remark) : null
  return out
}

const validate = (payload, { partial = false } = {}) => {
  if (payload.title !== undefined && !String(payload.title).trim()) return '作业标题不能为空'
  if (!partial && (!payload.title || !String(payload.title).trim())) return '作业标题不能为空'
  if (payload.questionIds !== undefined && payload.questionIds === null) return '题目列表必须是数组'
  if (payload.studentIds !== undefined && payload.studentIds === null) return '学生列表必须是数组'
  if (payload.status !== undefined && !STATUSES.includes(payload.status)) return '作业状态不合法'
  for (const key of ['startAt', 'endAt']) {
    if (payload[key] && Number.isNaN(new Date(payload[key]).getTime())) {
      return `${key === 'startAt' ? '开始时间' : '截止时间'}格式不正确`
    }
  }
  return null
}

// 把关联表数据挂回 homework 实例，保持前端兼容 questionIds / studentIds 数组
async function attachRelationsToInstance(homework) {
  await attachRelationsToInstances([homework])
  return homework
}

async function attachRelationsToInstances(homeworks) {
  const ids = homeworks.map((h) => h.id).filter(Boolean)
  if (!ids.length) return homeworks

  const [questions, students] = await Promise.all([
    HomeworkQuestion.findAll({
      where: { homeworkId: { [Op.in]: ids } },
      order: [
        ['homeworkId', 'ASC'],
        ['sort', 'ASC'],
        ['id', 'ASC']
      ]
    }),
    HomeworkStudent.findAll({
      where: { homeworkId: { [Op.in]: ids } },
      order: [
        ['homeworkId', 'ASC'],
        ['id', 'ASC']
      ]
    })
  ])

  const questionsByHomework = new Map()
  for (const relation of questions) {
    if (!questionsByHomework.has(relation.homeworkId))
      questionsByHomework.set(relation.homeworkId, [])
    questionsByHomework.get(relation.homeworkId).push(relation.questionId)
  }

  const studentsByHomework = new Map()
  for (const relation of students) {
    if (!studentsByHomework.has(relation.homeworkId))
      studentsByHomework.set(relation.homeworkId, [])
    studentsByHomework.get(relation.homeworkId).push(relation.studentId)
  }

  for (const homework of homeworks) {
    homework.setDataValue('questionIds', questionsByHomework.get(homework.id) || [])
    homework.setDataValue('studentIds', studentsByHomework.get(homework.id) || [])
  }
  return homeworks
}

async function replaceHomeworkQuestions(homeworkId, questionIds, transaction) {
  await HomeworkQuestion.destroy({ where: { homeworkId }, transaction })
  if (questionIds && questionIds.length) {
    await HomeworkQuestion.bulkCreate(
      questionIds.map((questionId, index) => ({ homeworkId, questionId, sort: index })),
      { transaction }
    )
  }
}

async function replaceHomeworkStudents(homeworkId, studentIds, transaction) {
  await HomeworkStudent.destroy({ where: { homeworkId }, transaction })
  if (studentIds && studentIds.length) {
    await HomeworkStudent.bulkCreate(
      studentIds.map((studentId) => ({ homeworkId, studentId })),
      { transaction }
    )
  }
}

exports.list = async (req, res, next) => {
  try {
    const { status, page, pageSize } = req.query
    const where = {}
    if (status) where.status = status

    const order = [['id', 'DESC']]

    // 传了 page 才分页；兼容旧调用方（不传 page 时仍返回数组）
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1)
      const size = Math.min(100, Math.max(1, Number(pageSize) || 20))
      const { rows, count } = await Homework.findAndCountAll({
        where,
        order,
        limit: size,
        offset: (pageNum - 1) * size
      })
      await attachRelationsToInstances(rows)
      return ok(res, { list: rows, total: count, page: pageNum, pageSize: size })
    }

    const list = await Homework.findAll({ where, order, limit: DEFAULT_LIST_LIMIT })
    await attachRelationsToInstances(list)
    ok(res, list)
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

    const homeworkData = { ...payload }
    delete homeworkData.questionIds
    delete homeworkData.studentIds
    let homework
    await sequelize.transaction(async (t) => {
      homework = await Homework.create(homeworkData, { transaction: t })
      if (payload.questionIds && payload.questionIds.length) {
        await HomeworkQuestion.bulkCreate(
          payload.questionIds.map((questionId, index) => ({
            homeworkId: homework.id,
            questionId,
            sort: index
          })),
          { transaction: t }
        )
      }
      if (payload.studentIds && payload.studentIds.length) {
        await HomeworkStudent.bulkCreate(
          payload.studentIds.map((studentId) => ({ homeworkId: homework.id, studentId })),
          { transaction: t }
        )
      }
    })
    await attachRelationsToInstance(homework)
    cacheDel('stats:overview')
    ok(res, homework, '创建成功')
  } catch (e) {
    next(e)
  }
}

// 详情（含成绩记录与学生信息）
exports.get = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id, {
      include: [{ model: Submission, include: [Student] }]
    })
    if (!homework) return fail(res, 40400, '作业不存在')
    await attachRelationsToInstance(homework)
    ok(res, homework)
  } catch (e) {
    next(e)
  }
}

// 作业包含的题目详情（按布置顺序，供导出 PDF 使用）
exports.getQuestions = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id)
    if (!homework) return fail(res, 40400, '作业不存在')
    const relations = await HomeworkQuestion.findAll({
      where: { homeworkId: homework.id },
      order: [
        ['sort', 'ASC'],
        ['id', 'ASC']
      ]
    })
    const ids = relations.map((h) => h.questionId)
    if (!ids.length) return ok(res, [])
    const questions = await Question.findAll({ where: { id: ids } })
    // 按布置顺序重排
    const map = new Map(questions.map((q) => [q.id, q]))
    const ordered = ids.map((id) => map.get(id)).filter(Boolean)
    ok(res, ordered)
  } catch (e) {
    next(e)
  }
}

exports.update = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id)
    if (!homework) return fail(res, 40400, '作业不存在')
    const payload = pick(req.body)
    const err = validate(payload, { partial: true })
    if (err) return fail(res, 40000, err)
    if (payload.title !== undefined) payload.title = payload.title.trim()

    const homeworkData = { ...payload }
    delete homeworkData.questionIds
    delete homeworkData.studentIds
    await sequelize.transaction(async (t) => {
      await homework.update(homeworkData, { transaction: t })
      if (payload.questionIds !== undefined) {
        await replaceHomeworkQuestions(homework.id, payload.questionIds, t)
      }
      if (payload.studentIds !== undefined) {
        await replaceHomeworkStudents(homework.id, payload.studentIds, t)
      }
    })
    await attachRelationsToInstance(homework)
    cacheDel('stats:overview')
    ok(res, homework, '更新成功')
  } catch (e) {
    next(e)
  }
}

// 删除作业（单条 / 批量共用）：先清理关联数据，再删作业本身
// 说明：submission 有 ON DELETE CASCADE 会随作业自动删除；
// lesson_summaries 无外键约束，必须显式删除，否则会留下打不开的孤儿记录。
async function purgeHomeworks(ids, transaction) {
  if (!ids.length) return { summaries: 0 }
  const summaries = await LessonSummary.count({
    where: { homeworkId: ids },
    transaction
  })
  await HomeworkQuestion.destroy({ where: { homeworkId: ids }, transaction })
  await HomeworkStudent.destroy({ where: { homeworkId: ids }, transaction })
  await LessonSummary.destroy({ where: { homeworkId: ids }, transaction })
  await Homework.destroy({ where: { id: ids }, transaction })
  return { summaries }
}

exports.remove = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id)
    if (!homework) return fail(res, 40400, '作业不存在')
    await sequelize.transaction((t) => purgeHomeworks([homework.id], t))
    cacheDel('stats:overview')
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}

// 批量删除作业：{ ids: [1,2,3] }
exports.bulkRemove = async (req, res, next) => {
  try {
    const raw = Array.isArray(req.body?.ids) ? req.body.ids : []
    const ids = [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))]
    if (!ids.length) return fail(res, 40000, '请先选择要删除的作业')

    const found = await Homework.findAll({ where: { id: ids }, attributes: ['id'] })
    if (!found.length) return fail(res, 40400, '所选作业都不存在（可能已被删除）')

    const existingIds = found.map((h) => h.id)
    let summaries = 0
    await sequelize.transaction(async (t) => {
      const result = await purgeHomeworks(existingIds, t)
      summaries = result.summaries
    })
    cacheDel('stats:overview')
    ok(
      res,
      { deleted: existingIds.length, summaries },
      `已删除 ${existingIds.length} 个作业` + (summaries ? `（含 ${summaries} 条课时总结）` : '')
    )
  } catch (e) {
    next(e)
  }
}

// 老师给作业的学生批量录入分数（学生线下做题，老师直接打分）
exports.score = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id)
    if (!homework) return fail(res, 40400, '作业不存在')

    const scores = Array.isArray(req.body.scores) ? req.body.scores : []
    const records = scores
      .filter((item) => item && item.studentId != null)
      .map((item) => ({
        homeworkId: homework.id,
        studentId: Number(item.studentId),
        score: Number(item.score) || 0
      }))

    if (records.length) {
      // 利用 (homework_id, student_id) 唯一索引，一条 bulkCreate 完成新增+更新
      await Submission.bulkCreate(records, { updateOnDuplicate: ['score'] })
    }

    cacheDel('stats:overview')
    ok(res, { saved: records.length }, '成绩已保存')
  } catch (e) {
    next(e)
  }
}
