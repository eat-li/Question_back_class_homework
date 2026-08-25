// 知识点分类控制器
const { KnowledgeCategory, Conclusion } = require('../models')
const { ok, fail } = require('../utils/response')

// 归一化输入字段，只保留允许写入的键
const pick = (body) => {
  const out = {}
  if (body.name !== undefined) out.name = String(body.name).slice(0, 50)
  if (body.parentId !== undefined)
    out.parentId =
      body.parentId === null || body.parentId === '' ? null : Number(body.parentId) || null
  if (body.sort !== undefined) out.sort = Number(body.sort) || 0
  if (body.remark !== undefined) out.remark = body.remark ? String(body.remark).slice(0, 255) : null
  return out
}

// 列表（树形返回：一级分类 + 其 children 二级子分类）
exports.list = async (req, res, next) => {
  try {
    const rows = await KnowledgeCategory.findAll({
      order: [
        ['sort', 'ASC'],
        ['id', 'ASC']
      ]
    })
    // 先为每个节点初始化 children 数组，再按父子关系挂载。
    // 否则当子节点的 sort 排到父节点之前时，父节点的 children 尚未初始化，会抛
    // 「Cannot read properties of undefined (reading 'push')」，导致分类列表整体 500。
    const nodes = rows.map((r) => ({ ...r.toJSON(), children: [] }))
    const roots = []
    const byId = new Map(nodes.map((n) => [n.id, n]))
    for (const n of nodes) {
      if (n.parentId && byId.has(n.parentId)) {
        byId.get(n.parentId).children.push(n)
      } else {
        roots.push(n)
      }
    }
    ok(res, roots)
  } catch (e) {
    next(e)
  }
}

exports.create = async (req, res, next) => {
  try {
    const payload = pick(req.body)
    if (!payload.name || !payload.name.trim()) return fail(res, 40000, '分类名不能为空')
    payload.name = payload.name.trim()
    const category = await KnowledgeCategory.create(payload)
    ok(res, category, '创建成功')
  } catch (e) {
    next(e)
  }
}

exports.update = async (req, res, next) => {
  try {
    const category = await KnowledgeCategory.findByPk(req.params.id)
    if (!category) return fail(res, 40400, '分类不存在')
    const payload = pick(req.body)
    if (payload.name !== undefined && !payload.name.trim())
      return fail(res, 40000, '分类名不能为空')
    if (payload.name !== undefined) payload.name = payload.name.trim()
    // 父分类不能指向自己，避免死循环
    if (payload.parentId != null && payload.parentId === Number(req.params.id)) {
      return fail(res, 40000, '父分类不能是自身')
    }
    await category.update(payload)
    ok(res, category, '更新成功')
  } catch (e) {
    next(e)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const category = await KnowledgeCategory.findByPk(id)
    if (!category) return fail(res, 40400, '分类不存在')

    // 关联保护：有子分类或已关联结论时禁止删除
    const [childCount, conclusionCount] = await Promise.all([
      KnowledgeCategory.count({ where: { parentId: id } }),
      Conclusion.count({ where: { categoryId: id } })
    ])
    if (childCount > 0)
      return fail(res, 40000, `该分类下还有 ${childCount} 个子分类，请先删除子分类`)
    if (conclusionCount > 0)
      return fail(res, 40000, `该分类下已关联 ${conclusionCount} 条结论，请先移动或删除结论`)

    await category.destroy()
    ok(res, null, '删除成功')
  } catch (e) {
    next(e)
  }
}
