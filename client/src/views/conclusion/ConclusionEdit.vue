<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
        <span class="title">{{ isEdit ? '编辑结论' : '发布结论' }}</span>
        <span v-if="isEdit" class="sub">{{ statusLabel }}</span>
      </div>

      <el-form :model="form" label-width="90px" class="edit-form">
        <el-form-item label="标题" required>
          <el-input
            v-model="form.title"
            placeholder="结论标题，如：等腰三角形三线合一"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-cascader
            v-model="categoryPath"
            :options="cascaderOptions"
            :props="cascaderProps"
            clearable
            placeholder="选择分类"
            style="width: 100%"
          />
          <div class="cat-tip">
            <template v-if="!cascaderOptions.length">
              还没有知识点分类，请先
              <el-button link type="primary" @click="goCategories">去创建分类</el-button>
            </template>
            <template v-else>
              找不到合适的分类？
              <el-button link type="primary" @click="goCategories">管理分类</el-button>
            </template>
          </div>
        </el-form-item>
        <el-form-item label="详细内容" required>
          <RichEditor v-model="form.content" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="一句话结论，便于列表与 PDF 速览（可选）"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="form.tags"
            placeholder="关键词，逗号分隔，如：三线合一,等腰三角形"
            maxlength="255"
          />
        </el-form-item>
      </el-form>

      <div class="edit-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button :icon="MagicStick" @click="aiDialogVisible = true">AI 生成</el-button>
        <el-button :icon="View" @click="previewVisible = true">预览</el-button>
        <el-button
          type="warning"
          plain
          :loading="saving === 'draft'"
          :disabled="saving !== null"
          @click="save('draft')"
          >保存草稿</el-button
        >
        <el-button
          type="primary"
          :icon="Check"
          :loading="saving === 'published'"
          :disabled="saving !== null"
          @click="save('published')"
          >发布</el-button
        >
      </div>
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="form.title || '预览'" width="720px" top="5vh">
      <div v-if="form.summary" class="preview-summary">摘要：{{ form.summary }}</div>
      <RichContent :html="form.content" />
    </el-dialog>

    <!-- AI 生成结论内容 -->
    <AiConclusionDialog
      v-model="aiDialogVisible"
      :title="form.title"
      :intro="form.summary"
      :category-name="categoryName"
      @apply="onAiApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ArrowLeft, Check, View, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConclusion, createConclusion, updateConclusion } from '../../api/conclusion'
import { getCategories } from '../../api/category'
import RichEditor from '../../components/RichEditor.vue'
import RichContent from '../../components/RichContent.vue'
import AiConclusionDialog from '../../components/AiConclusionDialog.vue'

const route = useRoute()
const router = useRouter()

const id = computed(() => {
  const raw = route.params.id
  return raw ? Number(raw) : null
})
const isEdit = computed(() => id.value != null)

const form = reactive<any>({
  title: '',
  content: '',
  summary: '',
  tags: ''
})

const categoryPath = ref<number[]>([])
const cascaderOptions = ref<any[]>([])
const cascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  checkStrictly: true,
  emitPath: true
}
const statusLabel = ref('')
const originalStatus = ref('draft') // 编辑加载时原始状态，用于「保存草稿撤下已发布」保护

const previewVisible = ref(false)
const aiDialogVisible = ref(false)

// 当前选中的分类 id / 名称，供 AI 生成作为上下文
const categoryId = computed(() =>
  categoryPath.value.length ? categoryPath.value[categoryPath.value.length - 1] : null
)
const findCategoryName = (nodes: any[], id: number): string => {
  for (const n of nodes) {
    if (n.id === id) return n.name
    if (n.children?.length) {
      const r = findCategoryName(n.children, id)
      if (r) return r
    }
  }
  return ''
}
const categoryName = computed(() =>
  categoryId.value != null ? findCategoryName(cascaderOptions.value, categoryId.value) : ''
)

// AI 生成结果应用：若已有手写内容则确认覆盖；写回 content/summary/tags
const onAiApply = async (payload: { content: string; summary: string; tags: string }) => {
  const plain = (form.content || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  if (plain) {
    try {
      await ElMessageBox.confirm(
        '当前详细内容已有文字，应用 AI 生成内容会替换它。确定继续？',
        '替换内容确认',
        { type: 'warning', confirmButtonText: '替换', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  form.content = payload.content
  if (payload.summary) form.summary = payload.summary
  if (payload.tags) form.tags = payload.tags
  aiDialogVisible.value = false
  ElMessage.success('已应用 AI 生成内容')
}

// —— 保存防连点 + 未保存离开守卫 ——
const saving = ref<'draft' | 'published' | null>(null)
let pristine = '' // 表单初始快照，用于判断是否有未保存修改
const snapshotForm = () => JSON.stringify({ f: { ...form }, c: categoryPath.value })
const isDirty = () => snapshotForm() !== pristine

// 把后端树形结构转为 el-cascader options（去掉空 children，避免叶子仍显示展开箭头）
const toCascaderOptions = (nodes: any[]): any[] =>
  nodes.map((n) => {
    const out: any = { id: n.id, name: n.name }
    if (n.children?.length) out.children = toCascaderOptions(n.children)
    return out
  })

// 根据 categoryId 反查其完整路径（用于编辑回显）
const findPath = (nodes: any[], target: number, path: number[] = []): number[] | null => {
  for (const n of nodes) {
    const next = [...path, n.id]
    if (n.id === target) return next
    if (n.children?.length) {
      const r = findPath(n.children, target, next)
      if (r) return r
    }
  }
  return null
}

const loadCategories = async () => {
  const tree = await getCategories()
  cascaderOptions.value = toCascaderOptions(tree)
  return tree
}

const load = async () => {
  const tree = await loadCategories()
  if (!isEdit.value) return
  const data = await getConclusion(id.value!)
  form.title = data.title
  form.content = data.content || ''
  form.summary = data.summary || ''
  form.tags = data.tags || ''
  originalStatus.value = data.status || 'draft'
  statusLabel.value = originalStatus.value === 'published' ? '已发布' : '草稿'
  categoryPath.value = findPath(tree, data.categoryId) || []
}

const save = async (status: 'draft' | 'published') => {
  if (saving.value) return
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  const categoryId = categoryPath.value.length
    ? categoryPath.value[categoryPath.value.length - 1]
    : null
  if (categoryId == null) {
    ElMessage.warning('请选择所属分类')
    return
  }
  const plain = (form.content || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  if (!plain) {
    ElMessage.warning('请填写详细内容')
    return
  }
  // 已发布结论「保存草稿」会把它撤下（不再可见），需显式确认
  if (isEdit.value && status === 'draft' && originalStatus.value === 'published') {
    try {
      await ElMessageBox.confirm(
        '该结论当前为「已发布」状态，保存草稿会将其撤下（列表中不再显示为已发布）。确定继续？',
        '撤下已发布内容',
        { type: 'warning', confirmButtonText: '仍要存为草稿', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  const payload = {
    title: form.title.trim(),
    categoryId,
    content: form.content,
    summary: form.summary || null,
    tags: form.tags || null,
    status
  }
  saving.value = status
  try {
    if (isEdit.value) {
      await updateConclusion(id.value!, payload)
      originalStatus.value = status
    } else {
      await createConclusion(payload)
    }
    ElMessage.success(status === 'published' ? '已发布' : '已保存草稿')
    pristine = snapshotForm() // 保存成功，视为已同步，离开不再拦截
    // 存完直接回列表，能马上看到刚发布的结论渲染效果
    router.push('/conclusions/list')
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('保存失败', err)
  } finally {
    saving.value = null
  }
}

// 未保存修改离开守卫：返回/切换路由前提示
onBeforeRouteLeave(async () => {
  if (!isDirty()) return true
  try {
    await ElMessageBox.confirm(
      '当前有未保存的修改，确定离开？（内容不会被自动保存）',
      '未保存提示',
      {
        type: 'warning',
        confirmButtonText: '放弃修改并离开',
        cancelButtonText: '继续编辑'
      }
    )
    return true
  } catch {
    return false
  }
})

const goBack = () => router.push('/conclusions/list')
const goCategories = () => router.push('/conclusions/categories')

onMounted(async () => {
  await load()
  pristine = snapshotForm() // 记录初始快照（新建=空表单；编辑=已加载内容）
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.sub {
  color: var(--ink-soft);
  font-size: 13px;
}
.edit-form {
  max-width: 860px;
}
.edit-actions {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}
/* 取消单独留在左侧，其余操作靠右：避免手滑点到「取消」丢掉刚写的内容 */
.edit-actions :deep(.el-button:first-child) {
  margin-right: auto;
}
/* 抵消 Element Plus 默认给相邻按钮加的 12px margin-left：
   它会和 flex gap 叠加，导致按钮间距忽大忽小（第一颗前面还是 0） */
.edit-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.cat-tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-top: 4px;
}
.preview-summary {
  color: var(--moss-deep);
  background: var(--moss-soft);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
