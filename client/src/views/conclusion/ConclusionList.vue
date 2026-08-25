<template>
  <div>
    <el-card>
      <div class="toolbar">
        <span class="title">结论</span>
        <span class="spacer"></span>
        <el-button :icon="FolderOpened" @click="goCategories">分类管理</el-button>
        <el-button type="primary" :icon="Plus" @click="goEdit()">新建结论</el-button>
      </div>

      <div class="filters">
        <el-select
          v-model="query.categoryId"
          placeholder="全部分类"
          clearable
          style="width: 180px"
          @change="onFilter"
        >
          <el-option v-for="c in flatCategories" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
        <el-select
          v-model="query.status"
          placeholder="全部状态"
          clearable
          style="width: 140px"
          @change="onFilter"
        >
          <el-option label="草稿" value="draft" />
          <el-option label="已发布" value="published" />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="标题 / 摘要 / 标签"
          clearable
          style="width: 240px"
          @keyup.enter="onFilter"
          @clear="onFilter"
        >
          <template #append><el-button :icon="Search" @click="onFilter" /></template>
        </el-input>
      </div>

      <el-table
        :data="list"
        border
        stripe
        v-loading="loading"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" width="150">
          <template #default="{ row }">{{ row.category?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button size="small" :icon="View" @click="preview(row)">预览</el-button>
              <el-button size="small" :icon="Edit" @click="goEdit(row.id)">编辑</el-button>
              <el-button
                size="small"
                :type="row.status === 'published' ? 'warning' : 'success'"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'published' ? '撤下' : '发布' }}
              </el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="remove(row)"
                >删除</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-bar">
        <el-button type="primary" :icon="Download" :disabled="!selection.length" @click="doExport">
          导出 PDF（已选 {{ selection.length }} 条）
        </el-button>
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="load"
          @size-change="onFilter"
        />
      </div>
    </el-card>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewData?.title || '预览'"
      width="720px"
      top="5vh"
    >
      <div v-if="previewData?.summary" class="preview-summary">摘要：{{ previewData.summary }}</div>
      <RichContent :html="previewData?.content || ''" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Download, Edit, Delete, View, Search, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConclusions, deleteConclusion, updateConclusionStatus } from '../../api/conclusion'
import { getCategories } from '../../api/category'
import { printHtml, escapeHtml } from '../../utils/printHtml'
import RichContent from '../../components/RichContent.vue'
import type { Conclusion, KnowledgeCategory } from '../../types'

const router = useRouter()

const list = ref<Conclusion[]>([])
const total = ref(0)
const loading = ref(false)
const selection = ref<Conclusion[]>([])

const query = reactive({
  categoryId: undefined as number | undefined,
  status: '',
  keyword: '',
  page: 1,
  pageSize: 20
})

// 扁平分类（供筛选下拉，二级分类显示「父 / 子」前缀）
const flatCategories = ref<{ value: number; label: string }[]>([])

const buildFlat = (nodes: KnowledgeCategory[], prefix = '') => {
  for (const n of nodes) {
    const label = prefix ? `${prefix} / ${n.name}` : n.name
    flatCategories.value.push({ value: n.id, label })
    if (n.children?.length) buildFlat(n.children, label)
  }
}

const loadCategories = async () => {
  const tree = await getCategories()
  flatCategories.value = []
  buildFlat(tree)
}

const load = async () => {
  loading.value = true
  try {
    const params: any = { page: query.page, pageSize: query.pageSize }
    if (query.categoryId != null) params.categoryId = query.categoryId
    if (query.status) params.status = query.status
    if (query.keyword) params.keyword = query.keyword
    const res = await getConclusions(params)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const onFilter = () => {
  query.page = 1
  load()
}

const onSelectionChange = (rows: any[]) => {
  selection.value = rows
}

const formatDateTime = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const goEdit = (id?: number) => {
  router.push(id ? `/conclusions/edit/${id}` : '/conclusions/edit')
}

const goCategories = () => router.push('/conclusions/categories')

const remove = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteConclusion(row.id)
  ElMessage.success('删除成功')
  load()
}

const toggleStatus = async (row: any) => {
  const next = row.status === 'published' ? 'draft' : 'published'
  await updateConclusionStatus(row.id, next)
  ElMessage.success(next === 'published' ? '已发布' : '已撤下')
  load()
}

// —— 预览 ——
const previewVisible = ref(false)
const previewData = ref<any>(null)
const preview = (row: any) => {
  previewData.value = row
  previewVisible.value = true
}

// —— 导出 PDF ——
const doExport = async () => {
  if (!selection.value.length) {
    ElMessage.warning('请先勾选要导出的结论')
    return
  }
  let header = '数学结论汇编'
  try {
    const { value } = await ElMessageBox.prompt('输入导出抬头（显示在打印页顶部）', '导出 PDF', {
      inputValue: header,
      confirmButtonText: '导出',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '抬头不能为空'
    })
    if (value) header = value.trim()
  } catch {
    return
  }
  const okFlag = printHtml(header, buildExportHtml(selection.value, header))
  if (!okFlag) ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
}

// 按模板拼装学生发放版 HTML（干净无编辑控件）
const buildExportHtml = (items: any[], header: string) => {
  const fs = 15
  const cards = items
    .map(
      (c, i) => `
      <div style="margin-bottom:16px;padding:14px 16px;border:1px solid #ddd;border-radius:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:12px;">
          <span style="font-weight:700;font-size:${fs}px;">${i + 1}. ${escapeHtml(c.title)}</span>
          <span style="color:#888;font-size:${fs - 3}px;flex-shrink:0;">知识点：${escapeHtml(c.category?.name || '—')}</span>
        </div>
        ${c.summary ? `<div style="color:#555;font-size:${fs - 1}px;margin-bottom:4px;">摘要：${escapeHtml(c.summary)}</div>` : ''}
        <div style="border-top:1px dashed #ccc;margin:8px 0;"></div>
        <div style="font-size:${fs}px;">${c.content || ''}</div>
      </div>`
    )
    .join('')

  return `
    <div style="font-family:'宋体','SimSun','Microsoft YaHei',serif;font-size:${fs}px;line-height:1.8;color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;">
      <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
        <div style="font-size:${fs + 6}px;font-weight:700;">${escapeHtml(header)}</div>
        <div style="font-size:${fs - 3}px;color:#555;margin-top:6px;">共 ${items.length} 条结论</div>
      </div>
      ${cards}
    </div>`
}

onMounted(() => {
  loadCategories()
  load()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
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
.spacer {
  flex: 1;
}
.filters {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.footer-bar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
.row-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
