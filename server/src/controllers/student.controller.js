// 学生管理控制器
const { Op } = require('sequelize')
const { Student } = require('../models')
const { ok, fail } = require('../utils/response')

// 列表（支持关键词 + 年级筛选）
exports.list = async (req, res, next) => {
  try {
    const { keyword, grade } = req.query
    const where = {}
    if (keyword) where.name = { [Op.like]: `%${keyword}%` }
    if (grade) where.grade = grade
    const list = await Student.findAll({ where, order: [['id', 'ASC']] })
    ok(res, list)
  } catch (e) {
    next(e)
  }
}

exports.create = async (req, res, next) => {
  try {
    const student = await Student.create(req.body)
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
    await student.update(req.body)
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
    for (const it of items) {
      if (!it || !it.name) {
        failed++
        continue
      }
      const payload = {
        name: it.name,
        grade: it.grade || null,
        contact: it.contact || null,
        remark: it.remark || null
      }
      const student = await Student.findOne({ where: { name: it.name } })
      if (student) {
        await student.update(payload)
        updated++
      } else {
        await Student.create(payload)
        created++
      }
    }
    ok(res, { created, updated, failed }, `导入完成：新增 ${created} 名，更新 ${updated} 名`)
  } catch (e) {
    next(e)
  }
}
