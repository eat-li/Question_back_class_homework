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
  Conclusion,
  LessonSummary
} = require('../models')
const { ok, fail } = require('../utils/response')

// 备份内容与恢复顺序：先父表后子表，保证外键/引用关系可恢复。
//
// 注意：新增业务表时必须同步加到这里，否则数据会静默丢失——
// lesson_summaries（课时总结）就漏过一次：导出与恢复都不含它，备份看着正常却少了一整张表。
//
// optional: true 表示「老备份包里可能没有这个文件」，恢复时按空表处理而不是报错，
// 保证加表之前导出的旧备份仍然可恢复。
//
// refs 声明该表的外键指向哪张表（键为模型属性名，值为 MODEL_LIST 里的 key）。
// 恢复时用它校验引用是否有效——备份包里的数据未必自洽（见下方 restore 里的说明）。
const MODEL_LIST = [
  { key: 'knowledge_categories', model: KnowledgeCategory },
  { key: 'students', model: Student },
  { key: 'questions', model: Question },
  { key: 'homeworks', model: Homework },
  {
    key: 'homework_questions',
    model: HomeworkQuestion,
    refs: { homeworkId: 'homeworks', questionId: 'questions' }
  },
  {
    key: 'homework_students',
    model: HomeworkStudent,
    refs: { homeworkId: 'homeworks', studentId: 'students' }
  },
  {
    key: 'submissions',
    model: Submission,
    refs: { homeworkId: 'homeworks', studentId: 'students' }
  },
  { key: 'exam_scores', model: ExamScore, refs: { studentId: 'students' } },
  { key: 'conclusions', model: Conclusion, refs: { categoryId: 'knowledge_categories' } },
  // 课时总结外键指向 homework 与 student，必须排在两者之后
  {
    key: 'lesson_summaries',
    model: LessonSummary,
    optional: true,
    refs: { homeworkId: 'homeworks', studentId: 'students' }
  }
]

// 取某张表当前全部主键：作为下游子表引用校验的"有效父 id 集合"
const loadIdSet = async (model, transaction) => {
  const rows = await model.findAll({ attributes: ['id'], raw: true, transaction })
  return new Set(rows.map((r) => Number(r.id)))
}

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
        '  lesson_summaries.json      课时总结（含上课时间、次数、内容、状态、课后任务）',
        '',
        '恢复方式：在「数据备份」页选择「恢复备份压缩包」，系统会按依赖顺序恢复全部数据。',
        '注意：恢复会按主键 id 插入或更新已有记录，请确认当前数据可被覆盖。',
        '　　　若备份中存在指向已删除数据的关联记录（孤儿数据），恢复时会自动跳过并在结果中提示。'
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

    // 必需文件缺一不可（用来识别选错/损坏的压缩包）；
    // 标了 optional 的新增表允许缺失——加表之前导出的老备份不该因此被拒。
    const missing = MODEL_LIST.filter(
      ({ key, optional }) => !optional && !Array.isArray(data[key])
    )
    if (missing.length) {
      return fail(res, 40000, `备份文件缺少：${missing.map((m) => m.key).join(', ')}`)
    }

    const result = {}
    // 被跳过的孤儿记录：备份包里的数据不一定自洽。
    // 真实案例：源库里删学生时没清 homework_students 关联，外包 MySQL 没开外键校验所以
    // 一直没报错；换到有外键约束的库恢复时，一条 student_id 指向已删学生的关联就足以
    // 让整包恢复失败（ER_NO_REFERENCED_ROW_2）。这里改为跳过并如实报告，不牵连其余数据。
    const skipped = {}
    await sequelize.transaction(async (t) => {
      const validIds = {}

      for (const { key, model, refs } of MODEL_LIST) {
        const rows = Array.isArray(data[key]) ? data[key] : []

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

        // 引用校验：父表此时已恢复完毕，validIds 里是库里真实存在的主键
        let accepted = records
        if (refs && records.length) {
          const dropped = []
          accepted = records.filter((row) => {
            const broken = Object.entries(refs).find(([attr, parentKey]) => {
              const value = row[attr]
              if (value === undefined || value === null) return false
              const parents = validIds[parentKey]
              return parents && !parents.has(Number(value))
            })
            if (!broken) return true
            dropped.push({ id: row.id, field: broken[0], value: row[broken[0]], parent: broken[1] })
            return false
          })
          if (dropped.length) skipped[key] = dropped
        }

        if (accepted.length) {
          // updateOnDuplicate 里排除 id 自身，避免把主键也写进 SET 子句
          await model.bulkCreate(accepted, {
            transaction: t,
            updateOnDuplicate: attributes.filter((attr) => attr !== 'id')
          })
        }
        result[key] = accepted.length
        validIds[key] = await loadIdSet(model, t)
      }
    })

    const skippedTotal = Object.values(skipped).reduce((sum, list) => sum + list.length, 0)
    ok(
      res,
      { counts: result, skipped, skippedTotal },
      skippedTotal
        ? `恢复完成，其中 ${skippedTotal} 条关联记录因引用的数据已不存在被跳过`
        : '恢复完成'
    )
  } catch (e) {
    next(e)
  }
}
