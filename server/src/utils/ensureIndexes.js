// 安全创建数据库索引（性能优化用）。
//
// 不依赖 sequelize 的 `sync({ alter: true })` 来管理索引：其在全局
// `underscored: true` 模式下，索引 fields 不会把 camelCase 属性名映射成
// snake_case 物理列名（如 knowledgeTag -> knowledge_tag），会生成
// `ADD INDEX (knowledgeTag)` 导致 MySQL 报 "Key column 'knowledgeTag'
// doesn't exist in table"，从而让整个服务启动崩溃。
//
// 这里改用原生 DDL 在 sync 之后补建索引，并对“索引已存在”等可忽略错误做
// 静默处理，保证应用始终能正常启动。索引均为纯性能增强，不改变任何业务行为。

// 表名与索引定义：[表名, 索引名, 物理列名(已为 snake_case)]
const INDEXES = [
  ['student', 'idx_student_name', ['name']],
  ['student', 'idx_student_grade', ['grade']],
  ['question', 'idx_question_type', ['type']],
  ['question', 'idx_question_difficulty', ['difficulty']],
  ['question', 'idx_question_knowledge_tag', ['knowledge_tag']],
  ['homework', 'idx_homework_status', ['status']],
  ['submission', 'idx_submission_homework', ['homework_id']],
  ['submission', 'idx_submission_student', ['student_id']],
  ['exam_scores', 'idx_exam_score_student', ['student_id']],
  ['exam_scores', 'idx_exam_score_date', ['exam_date']],
  ['exam_scores', 'idx_exam_score_type', ['exam_type']],
  ['exam_scores', 'idx_exam_score_subject', ['subject']],
  ['knowledge_categories', 'idx_knowledge_category_name', ['name']],
  ['conclusions', 'idx_conclusion_category', ['category_id']],
  ['conclusions', 'idx_conclusion_status', ['status']],
  ['conclusions', 'idx_conclusion_title', ['title']]
]

// 这些错误码表示索引/列已存在或重复，可安全忽略，不应中断启动
const IGNORE_CODES = new Set([
  'ER_DUP_KEYNAME', // 1061 索引名重复
  'ER_DUP_INDEX', // 1831 索引重复
  'ER_DUP_FIELDNAME' // 1060 列重复
])

async function ensureIndexes(sequelize) {
  for (const [table, name, cols] of INDEXES) {
    const colList = cols.map((c) => '`' + c + '`').join(', ')
    try {
      await sequelize.query(
        `CREATE INDEX \`${name}\` ON \`${table}\` (${colList})`,
        { raw: true }
      )
      console.log(`✔ 已确保索引 ${name} (${table})`)
    } catch (e) {
      const code = e.code || e.parent?.code
      if (IGNORE_CODES.has(code)) {
        // 索引已存在，符合预期，忽略
        continue
      }
      // 其它意外错误仅告警，不中断启动（索引缺失只影响性能，不影响功能）
      console.warn(`⚠️ 创建索引 ${name} 失败（已忽略）: ${e.message}`)
    }
  }
}

module.exports = { ensureIndexes, INDEXES }
