// 学生管理控制器
const { Op } = require('sequelize')
const { Student } = require('../models')
const { ok, fail } = require('../utils/response')

// 列表（支持关键词检索 + 班级筛选）
exports.list = async (req, res, next) => {
  try {
    const { keyword, className } = req.query
    const where = {}
    if (keyword) where.name = { [Op.like]: `%${keyword}%` }
    if (className) where.className = className
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
