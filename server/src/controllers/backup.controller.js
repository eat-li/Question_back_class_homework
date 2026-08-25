// 数据备份控制器（导出全量数据为压缩包 + 从压缩包恢复）
const JSZip = require('jszip')
const {
  sequelize,
  Question,
  Homework,
  HomeworkQuestion,
  HomeworkStudent,
  Student,
  Submission,
  ExamScore,
  KnowledgeCategory,
  Conclusion
} = require('../models')
const { ok, fail } = require('../utils/response')

// 备份内容与恢复顺序：先父表后子表，保证外键/引用关系可恢复
const MODEL_LIST = [
  { key: 'knowledge_categories', model: KnowledgeCategory },
  { key: 'students', model: Student },
  { key: 'questions', model: Question },
  { key: 'homeworks', model: Homework },
  { key: 'homework_questions', model: HomeworkQuestion },
  { key: 'homework_students', model: HomeworkStudent },
  { key: 'submissions', model: Submission },
  { key: 'exam_scores', model: ExamScore },
  { key: 'conclusions', model: Conclusion }
]

exports.export = async (req, res, next) => {
  try {
    const all = await Promise.all(
      MODEL_LIST.map(({ model }) => model.findAll({ order: [['id', 'ASC']] }))
    )

    const zip = new JSZip()
    MODEL_LIST.forEach(({ key }, i) => {
      zip.file(`${key}.json`, JSON.stringify(all[i], null, 2))
    })
    zip.file(
      'README.txt',
      [
        '数学老师综合管理后台 - 数据备份',
        '导出时间：' + new Date().toLocaleString('zh-CN'),
        '',
        '文件说明：',
        '  knowledge_categories.json  知识点分类',
        '  students.json              学生名单',
        '  questions.json             题目（含题干、选项、答案、解析等）',
        '  homeworks.json             作业基本信息',
        '  homework_questions.json    作业-题目关联',
        '  homework_students.json     作业-学生关联',
        '  submissions.json           作业成绩',
        '  exam_scores.json           测评成绩（期末/期中/小测等）',
        '  conclusions.json           结论（含发布状态）',
        '',
        '恢复方式：在「数据备份」页选择「恢复备份压缩包」，系统会按依赖顺序恢复全部数据。',
        '注意：恢复会按主键 id 插入或更新已有记录，请确认当前数据可被覆盖。'
      ].join('\n')
    )

    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="backup-${Date.now()}.zip"`)
    res.send(buf)
  } catch (e) {
    next(e)
  }
}

exports.restore = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 40000, '未接收到备份文件')

    const zip = await JSZip.loadAsync(req.file.buffer)

    const readJson = async (name) => {
      const file = zip.file(name)
      if (!file) return null
      const text = await file.async('string')
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    const data = {}
    for (const { key } of MODEL_LIST) {
      data[key] = await readJson(`${key}.json`)
    }

    const missing = MODEL_LIST.filter(({ key }) => !Array.isArray(data[key]))
    if (missing.length) {
      return fail(res, 40000, `备份文件缺少：${missing.map((m) => m.key).join(', ')}`)
    }

    const result = {}
    await sequelize.transaction(async (t) => {
      for (const { key, model } of MODEL_LIST) {
        const rows = data[key]
        if (!rows.length) {
          result[key] = 0
          continue
        }

        // 保留 id 与 created_at/updated_at，便于按主键恢复关联关系
        const attributes = Object.keys(model.getAttributes())
        const records = rows
          .slice()
          .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
          .map((row) => {
            const out = {}
            for (const attr of attributes) {
              if (row[attr] !== undefined) out[attr] = row[attr]
            }
            return out
          })

        const updateFields = attributes.filter((attr) => attr !== 'id')
        await model.bulkCreate(records, {
          transaction: t,
          updateOnDuplicate: updateFields
        })
        result[key] = records.length
      }
    })

    ok(res, result, '恢复完成')
  } catch (e) {
    next(e)
  }
}
