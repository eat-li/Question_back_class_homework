// 学生管理控制器
const { Op } = require('sequelize')
const { Student } = require('../models')
const { ok, fail } = require('../utils/response')
const { cacheDel } = require('../utils/cache')

// 字段白名单：只允许写入模型定义中允许的字段，并做基本长度归一化
const pick = (body = {}) => {
  const out = {}
  if (body.name !== undefined) out.name = String(body.name).slice(0, 50)
  if (body.grade !== undefined) out.grade = body.grade ? String(body.grade).slice(0, 50) : null
  if (body.contact !== undefined)
    out.contact = body.contact ? String(body.contact).slice(0, 100) : null
  if (body.remark !== undefined) out.remark = body.remark ? String(body.remark) : null
  return out
}

const validate = (payload, { partial = false } = {}) => {
  if (payload.name !== undefined && !String(payload.name).trim()) return '姓名不能为空'
  if (!partial && (!payload.name || !String(payload.name).trim())) return '姓名不能为空'
  return null
}

// 列表（支持关键词 + 年级筛选，支持分页）
exports.list = async (req, res, next) => {
  try {
    const { keyword, grade, page, pageSize } = req.query
    const where = {}
    if (keyword) where.name = { [Op.like]: `%${keyword}%` }
    if (grade) where.grade = grade

    const order = [['id', 'ASC']]

    // 传了 page 才分页；兼容旧调用方（不传 page 时仍返回数组）
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1)
      const size = Math.min(100, Math.max(1, Number(pageSize) || 20))
      const { rows, count } = await Student.findAndCountAll({
        where,
        order,
        limit: size,
        offset: (pageNum - 1) * size
      })
      return ok(res, { list: rows, total: count, page: pageNum, pageSize: size })
    }

    const list = await Student.findAll({ where, order })
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
    payload.name = payload.name.trim()
    const student = await Student.create(payload)
    cacheDel('stats:overview')
    ok(res, student, '创建成功')
  } catch (e) {
    next(e)
  }
}

exports.get = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id)
    if (!student) return fail(res, 40400, '学生不存在')
    ok(res, student)
  } catch (e) {
    next(e)
  }
}

exports.update = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id)
    if (!student) return fail(res, 40400, '学生不存在')
    const payload = pick(req.body)
    const err = validate(payload, { partial: true })
    if (err) return fail(res, 40000, err)
    if (payload.name !== undefined) payload.name = payload.name.trim()
    await student.update(payload)
    cacheDel('stats:overview')
    ok(res, student, '更新成功')
  } catch (e) {
    next(e)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const student = await Student.findByPk(req.params.id)
    if (!student) return fail(res, 40400, '学生不存在')
    await student.destroy()
    cacheDel('stats:overview')
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}

// 导出学生信息为 JSON 文件
exports.export = async (req, res, next) => {
  try {
    const students = await Student.findAll({ order: [['id', 'ASC']] })
    const data = students.map((s) => ({
      name: s.name,
      grade: s.grade,
      contact: s.contact,
      remark: s.remark
    }))
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="students-${Date.now()}.json"`)
    res.send(JSON.stringify(data, null, 2))
  } catch (e) {
    next(e)
  }
}

// 导入学生信息（body 为学生数组，按姓名判断：存在则更新，否则新增）
exports.import = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : []
    if (!items.length) return fail(res, 40000, '没有可导入的数据')

    let created = 0
    let updated = 0
    let failed = 0

    // 一次性取出全部已有学生，按姓名建索引，把原「循环内逐条 findOne」的 N+1 查询
    // 降为 1 次查询 + 1 次批量写入，导入大文件时性能提升显著。
    const existing = await Student.findAll({ attributes: ['id', 'name'] })
    const byName = new Map(existing.map((s) => [s.name, s]))

    const toCreate = []
    for (const it of items) {
      if (!it || !it.name) {
        failed++
        continue
      }
      const payload = pick(it)
      if (!payload.name || !String(payload.name).trim()) {
        failed++
        continue
      }
      payload.name = payload.name.trim()
      const student = byName.get(payload.name)
      if (student) {
        await student.update(payload)
        updated++
      } else {
        toCreate.push(payload)
        created++
      }
    }
    if (toCreate.length) await Student.bulkCreate(toCreate)

    cacheDel('stats:overview')
    ok(res, { created, updated, failed }, `导入完成：新增 ${created} 名，更新 ${updated} 名`)
  } catch (e) {
    next(e)
  }
}
