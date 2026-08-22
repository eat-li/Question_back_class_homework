// 数据备份控制器（导出全量数据为压缩包）
const JSZip = require('jszip')
const { Question, Homework, Student, Submission } = require('../models')

exports.export = async (req, res, next) => {
  try {
    const [questions, homeworks, students, submissions] = await Promise.all([
      Question.findAll({ order: [['id', 'ASC']] }),
      Homework.findAll({ order: [['id', 'ASC']] }),
      Student.findAll({ order: [['id', 'ASC']] }),
      Submission.findAll({ order: [['id', 'ASC']] })
    ])

    const zip = new JSZip()
    zip.file('questions.json', JSON.stringify(questions, null, 2))
    zip.file('homeworks.json', JSON.stringify(homeworks, null, 2))
    zip.file('students.json', JSON.stringify(students, null, 2))
    zip.file('submissions.json', JSON.stringify(submissions, null, 2))
    zip.file(
      'README.txt',
      [
        '数学老师综合管理后台 - 数据备份',
        '导出时间：' + new Date().toLocaleString('zh-CN'),
        '',
        '文件说明：',
        '  questions.json    题目（含题干、选项、答案、解析等）',
        '  homeworks.json    作业（含选中的学生、题目、截止时间等）',
        '  students.json     学生名单',
        '  submissions.json  成绩记录',
        '',
        '恢复方式：电脑重装后，可用「数据备份」页的导入功能恢复学生信息；',
        '题目与作业可参考对应 JSON 内容手动重建，或联系开发者提供恢复工具。'
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
