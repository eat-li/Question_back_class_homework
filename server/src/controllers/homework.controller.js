// 作业与成绩控制器
const { Homework, Submission, Student, Question } = require('../models')
const { ok, fail } = require('../utils/response')

exports.list = async (req, res, next) => {
  try {
    const list = await Homework.findAll({ order: [['id', 'DESC']] })
    ok(res, list)
  } catch (e) {
    next(e)
  }
}

exports.create = async (req, res, next) => {
  try {
    const homework = await Homework.create(req.body)
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
    const ids = homework.questionIds || []
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
    await homework.update(req.body)
    ok(res, homework, '更新成功')
  } catch (e) {
    next(e)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const homework = await Homework.findByPk(req.params.id)
    if (!homework) return fail(res, 40400, '作业不存在')
    await homework.destroy()
    ok(res, null, '删除成功')
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
    const saved = []
    for (const item of scores) {
      if (item.studentId == null) continue
      const score = Number(item.score) || 0
      const [record] = await Submission.findOrCreate({
        where: { homeworkId: homework.id, studentId: item.studentId },
        defaults: { score }
      })
      if (record.score !== score) {
        record.score = score
        await record.save()
      }
      saved.push(record)
    }
    ok(res, saved, '成绩已保存')
  } catch (e) {
    next(e)
  }
}
