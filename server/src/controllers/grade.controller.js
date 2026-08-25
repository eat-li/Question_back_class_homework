// 测评成绩控制器（正式考试/小测，区别于作业练习分）
const { Op } = require('sequelize')
const { ExamScore, Student } = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheGet, cacheSet, cacheDelByPrefix } = require('../utils/cache')

// 汇总聚合结果变化不频繁，加短 TTL 缓存降低数据库压力
const SUMMARY_TTL = 10000

const EXAM_TYPES = ['final', 'mid', 'quiz', 'popquiz']

// 归一化单条成绩输入；非法行返回 null（分数越界、缺学生、分数非数字等）
const normalize = (it) => {
  if (!it || it.studentId == null) return null
  if (!it.examDate) return null
  const score = Number(it.score)
  const fullScore = Number(it.fullScore) || 100
  if (!Number.isFinite(score)) return null
  if (score < 0 || score > fullScore) return null
  return {
    studentId: it.studentId,
    examType: EXAM_TYPES.includes(it.examType) ? it.examType : 'quiz',
    subject: (it.subject || '数学').toString().slice(0, 50),
    score,
    fullScore,
    examDate: it.examDate,
    comment: it.comment ? String(it.comment).slice(0, 255) : null
  }
}

// 唯一键：同一学生·类型·科目·日期视为同一场考试，重复录入走「更新」
const keyOf = (p) => `${p.studentId}|${p.examType}|${p.subject}|${p.examDate || ''}`

// 组装成绩表查询条件（list / summary 共用）
const buildWhere = (query) => {
  const { studentId, subject, examType, startDate, endDate, examDate } = query
  const where = {}
  if (studentId) where.studentId = Number(studentId)
  if (subject) where.subject = subject
  if (examType) where.examType = examType
  // 单日期精确匹配优先；否则按区间
  if (examDate) {
    where.examDate = examDate
  } else if (startDate || endDate) {
    where.examDate = {}
    if (startDate) where.examDate[Op.gte] = startDate
    if (endDate) where.examDate[Op.lte] = endDate
  }
  return where
}

// 组装关联学生表的查询条件（按姓名模糊匹配，可选）
const buildStudentWhere = (query) => {
  const { studentName } = query
  if (studentName) return { name: { [Op.like]: `%${studentName}%` } }
  return undefined
}

// 列表（支持学生/科目/考试类型/日期区间筛选，含学生信息）
exports.list = async (req, res, next) => {
  try {
    const list = await ExamScore.findAll({
      where: buildWhere(req.query),
      include: [
        { model: Student, attributes: ['id', 'name', 'grade'], where: buildStudentWhere(req.query) }
      ],
      order: [
        ['examDate', 'DESC'],
        ['id', 'DESC']
      ]
    })
    ok(res, list)
  } catch (e) {
    next(e)
  }
}

// 单条新增（唯一键已存在则更新）
exports.create = async (req, res, next) => {
  try {
    const payload = normalize(req.body)
    if (!payload) return fail(res, 40000, '数据不合法：请检查学生与分数范围')
    const [record, created] = await ExamScore.findOrCreate({
      where: {
        studentId: payload.studentId,
        examType: payload.examType,
        subject: payload.subject,
        examDate: payload.examDate
      },
      defaults: payload
    })
    if (!created) await record.update(payload)
    cacheDelByPrefix('grades:summary:')
    ok(res, record, created ? '保存成功' : '已更新同场考试成绩')
  } catch (e) {
    next(e)
  }
}

// 批量导入（body 为成绩数组，按唯一键去重后区分新增/更新）
exports.import = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : []
    if (!items.length) return fail(res, 40000, '没有可导入的数据')

    let failed = 0
    // 1) 输入去重：同一唯一键后者覆盖前者
    const inputMap = new Map()
    for (const it of items) {
      const payload = normalize(it)
      if (!payload) {
        failed++
        continue
      }
      inputMap.set(keyOf(payload), payload)
    }

    // 2) 只加载本次涉及学生的已有成绩，避免全表加载
    const studentIds = [...new Set([...inputMap.values()].map((p) => p.studentId))]
    const existing = studentIds.length
      ? await ExamScore.findAll({ where: { studentId: { [Op.in]: studentIds } } })
      : []
    const byKey = new Map(existing.map((r) => [keyOf(r), r]))

    // 3) 区分新增 / 更新，最后用一次 bulkCreate 批量写入
    const toWrite = []
    let updated = 0
    for (const [k, payload] of inputMap) {
      const record = byKey.get(k)
      if (record) {
        toWrite.push({ ...payload, id: record.id })
        updated++
      } else {
        toWrite.push(payload)
      }
    }
    if (toWrite.length) {
      await ExamScore.bulkCreate(toWrite, {
        updateOnDuplicate: ['score', 'fullScore', 'comment']
      })
    }
    cacheDelByPrefix('grades:summary:')

    const created = toWrite.length - updated
    ok(
      res,
      { created, updated, failed },
      `导入完成：新增 ${created} 条，更新 ${updated} 条${failed ? `，跳过 ${failed} 条非法行` : ''}`
    )
  } catch (e) {
    next(e)
  }
}

// 学生卡片聚合：每个学生的考试次数 + 最近一次成绩（返回紧凑数据，避免全量成绩传到前端）
exports.cards = async (req, res, next) => {
  try {
    const { studentName } = req.query
    const [students, rows] = await Promise.all([
      Student.findAll({ order: [['id', 'ASC']] }),
      ExamScore.findAll({
        where: buildWhere(req.query),
        include: [
          {
            model: Student,
            attributes: ['id', 'name', 'grade'],
            where: buildStudentWhere(req.query)
          }
        ],
        order: [
          ['examDate', 'DESC'],
          ['id', 'DESC']
        ]
      })
    ])

    const byStudent = new Map()
    for (const r of rows) {
      if (!byStudent.has(r.studentId)) {
        byStudent.set(r.studentId, { examCount: 0, latest: null })
      }
      const agg = byStudent.get(r.studentId)
      agg.examCount++
      if (!agg.latest) {
        const data = r.toJSON()
        agg.latest = {
          id: data.id,
          studentId: data.studentId,
          examType: data.examType,
          subject: data.subject,
          score: data.score,
          fullScore: data.fullScore,
          examDate: data.examDate,
          comment: data.comment
        }
      }
    }

    const cards = students
      .filter(
        (s) => !studentName || s.name.toLowerCase().includes(String(studentName).toLowerCase())
      )
      .map((s) => {
        const agg = byStudent.get(s.id) || { examCount: 0, latest: null }
        return {
          id: s.id,
          name: s.name,
          grade: s.grade,
          examCount: agg.examCount,
          latest: agg.latest
        }
      })

    ok(res, cards)
  } catch (e) {
    next(e)
  }
}

// 汇总聚合：趋势（折线）、能力（雷达）、分数段（饼图）、班级对比（柱状）
exports.summary = async (req, res, next) => {
  try {
    const { studentId, subject, examType, startDate, endDate } = req.query
    const cacheKey =
      'grades:summary:' +
      JSON.stringify({
        studentId: studentId || null,
        subject: subject || null,
        examType: examType || null,
        startDate: startDate || null,
        endDate: endDate || null
      })
    const cached = cacheGet(cacheKey)
    if (cached) return ok(res, cached)

    const rows = await ExamScore.findAll({
      where: buildWhere(req.query),
      include: [
        { model: Student, attributes: ['id', 'name', 'grade'], where: buildStudentWhere(req.query) }
      ],
      order: [
        ['examDate', 'ASC'],
        ['id', 'ASC']
      ]
    })

    // 折算百分比（满分可能不同，用百分比统一可比口径）
    const percent = (r) => (r.fullScore > 0 ? (r.score / r.fullScore) * 100 : 0)

    // —— 分数段分布 ——
    const bands = [
      { key: 'excellent', label: '优秀(≥90)', test: (p) => p >= 90 },
      { key: 'good', label: '良好(80-89)', test: (p) => p >= 80 && p < 90 },
      { key: 'pass', label: '及格(60-79)', test: (p) => p >= 60 && p < 80 },
      { key: 'fail', label: '不及格(<60)', test: (p) => p < 60 }
    ]
    const distribution = bands.map((b) => ({ key: b.key, label: b.label, count: 0 }))
    for (const r of rows) {
      const p = percent(r)
      const band = bands.find((b) => b.test(p))
      if (band) distribution.find((d) => d.key === band.key).count++
    }

    // —— 班级对比（各学生平均百分比）——
    const stuMap = new Map()
    for (const r of rows) {
      const key = r.studentId
      if (!stuMap.has(key)) {
        stuMap.set(key, {
          studentId: key,
          name: r.student?.name || `学生${key}`,
          grade: r.student?.grade || null,
          sum: 0,
          count: 0
        })
      }
      const agg = stuMap.get(key)
      agg.sum += percent(r)
      agg.count++
    }
    const compare = [...stuMap.values()]
      .map((a) => ({
        studentId: a.studentId,
        name: a.name,
        grade: a.grade,
        avgPercent: Math.round((a.sum / a.count) * 10) / 10,
        count: a.count
      }))
      .sort((a, b) => b.avgPercent - a.avgPercent)

    // —— 趋势（单学生时按科目分组时间序列）——
    const trend = []
    // —— 雷达（单学生各科平均百分比，忽略科目筛选以呈现全科能力）——
    const radar = []

    if (studentId) {
      // 雷达：忽略 subject 过滤，看该学生所有科目
      const radarWhere = { studentId: Number(studentId) }
      if (examType) radarWhere.examType = examType
      if (startDate || endDate) {
        radarWhere.examDate = {}
        if (startDate) radarWhere.examDate[Op.gte] = startDate
        if (endDate) radarWhere.examDate[Op.lte] = endDate
      }
      const radarRows = await ExamScore.findAll({ where: radarWhere })
      const subjectAgg = new Map()
      for (const r of radarRows) {
        if (!subjectAgg.has(r.subject)) subjectAgg.set(r.subject, { sum: 0, count: 0 })
        const agg = subjectAgg.get(r.subject)
        agg.sum += percent(r)
        agg.count++
      }
      for (const [subj, agg] of subjectAgg) {
        radar.push({
          subject: subj,
          avgPercent: Math.round((agg.sum / agg.count) * 10) / 10,
          count: agg.count
        })
      }

      // 趋势：按科目分组，组内按日期升序
      const trendMap = new Map()
      for (const r of rows) {
        if (!trendMap.has(r.subject)) trendMap.set(r.subject, [])
        trendMap.get(r.subject).push(r)
      }
      for (const [subj, rs] of trendMap) {
        trend.push({
          subject: subj,
          points: rs.map((r) => ({
            date: r.examDate,
            examType: r.examType,
            score: r.score,
            fullScore: r.fullScore,
            percent: Math.round(percent(r) * 10) / 10
          }))
        })
      }
    }

    const payload = { trend, radar, distribution, compare }
    cacheSet(cacheKey, payload, SUMMARY_TTL)
    ok(res, payload)
  } catch (e) {
    next(e)
  }
}

exports.get = async (req, res, next) => {
  try {
    const record = await ExamScore.findByPk(req.params.id, {
      include: [{ model: Student, attributes: ['id', 'name', 'grade'] }]
    })
    if (!record) return fail(res, 40400, '成绩记录不存在')
    ok(res, record)
  } catch (e) {
    next(e)
  }
}

exports.update = async (req, res, next) => {
  try {
    const payload = normalize(req.body)
    if (!payload) return fail(res, 40000, '数据不合法：请检查学生与分数范围')
    const record = await ExamScore.findByPk(req.params.id)
    if (!record) return fail(res, 40400, '成绩记录不存在')
    await record.update(payload)
    cacheDelByPrefix('grades:summary:')
    ok(res, record, '更新成功')
  } catch (e) {
    next(e)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const record = await ExamScore.findByPk(req.params.id)
    if (!record) return fail(res, 40400, '成绩记录不存在')
    await record.destroy()
    cacheDelByPrefix('grades:summary:')
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}
