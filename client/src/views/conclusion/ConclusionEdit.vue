<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
        <span class="title">{{ isEdit ? '编辑结论' : '新建结论' }}</span>
        <span v-if="isEdit" class="sub">{{ statusLabel }}</span>
      </div>

      <el-form :model="form" label-width="90px" class="edit-form">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="结论标题，如：等腰三角形三线合一" maxlength="200" show-word-limit />
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
          <el-input v-model="form.tags" placeholder="关键词，逗号分隔，如：三线合一,等腰三角形" maxlength="255" />
        </el-form-item>
      </el-form>

      <div class="edit-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button :icon="View" @click="previewVisible = true">预览</el-button>
        <el-button type="warning" plain @click="save('draft')">保存草稿</el-button>
        <el-button type="primary" :icon="Check" @click="save('published')">发布</el-button>
      </div>
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="form.title || '预览'" width="720px" top="5vh">
      <div v-if="form.summary" class="preview-summary">摘要：{{ form.summary }}</div>
      <RichContent :html="form.content" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getConclusion, createConclusion, updateConclusion } from '../../api/conclusion'
import { getCategories } from '../../api/category'
import RichEditor from '../../components/RichEditor.vue'
import RichContent from '../../components/RichContent.vue'

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
const cascaderProps = { value: 'id', label: 'name', children: 'children', checkStrictly: true, emitPath: true }
const statusLabel = ref('')

const previewVisible = ref(false)

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
  statusLabel.value = data.status === 'published' ? '已发布' : '草稿'
  categoryPath.value = findPath(tree, data.categoryId) || []
}

const save = async (status: 'draft' | 'published') => {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  const categoryId = categoryPath.value.length ? categoryPath.value[categoryPath.value.length - 1] : null
  if (categoryId == null) {
    ElMessage.warning('请选择所属分类')
    return
  }
  const plain = (form.content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  if (!plain) {
    ElMessage.warning('请填写详细内容')
    return
  }
  const payload = {
    title: form.title.trim(),
    categoryId,
    content: form.content,
    summary: form.summary || null,
    tags: form.tags || null,
    status
  }
  if (isEdit.value) {
    await updateConclusion(id.value!, payload)
  } else {
    await createConclusion(payload)
  }
  ElMessage.success(status === 'published' ? '已发布' : '已保存草稿')
  router.push('/conclusions')
}

const goBack = () => router.push('/conclusions')

onMounted(load)
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
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
