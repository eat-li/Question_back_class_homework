<template>
  <div class="conclusion-list">
    <el-card>
      <div class="toolbar">
        <span class="title">结论列表</span>
        <span class="count">共 {{ total }} 条</span>
        <span class="spacer"></span>
        <el-button :icon="FolderOpened" @click="goCategories">分类管理</el-button>
        <el-button type="primary" :icon="Plus" @click="goPublish">发布结论</el-button>
      </div>

      <div class="filters">
        <el-select
          v-model="query.categoryId"
          placeholder="全部分类"
          clearable
          style="width: 200px"
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
          <template #append
            ><el-button :icon="Search" aria-label="搜索" @click="onFilter"
          /></template>
        </el-input>
        <span class="spacer"></span>
        <el-button text :icon="expandAll ? Fold : Expand" @click="toggleAllFolds">
          {{ expandAll ? '全部收起' : '全部展开' }}
        </el-button>
      </div>

      <div v-loading="loading" class="cards">
        <el-empty
          v-if="!list.length && !loading"
          description="还没有结论，点右上角「发布结论」开始录入"
        />
        <article v-for="row in list" :key="row.id" class="cc">
          <header class="cc-head">
            <el-checkbox
              class="cc-check"
              :model-value="picked.includes(row.id)"
              @change="togglePick(row.id)"
            />
            <h3 class="cc-title">{{ row.title }}</h3>
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
            <el-tag type="info" effect="plain" size="small">
              {{ row.category?.name || '未分类' }}
            </el-tag>
            <span class="cc-time">{{ formatDateTime(row.updatedAt) }}</span>
          </header>

          <div v-if="row.summary" class="cc-summary">{{ row.summary }}</div>

          <!-- 直接渲染正文：与预览/导出同一条链路（消毒 + 公式渲染） -->
          <div class="cc-body" :class="{ 'cc-body--folded': folded[row.id] }">
            <RichContent :html="row.content || ''" />
          </div>

          <div class="cc-foot">
            <el-button size="small" text @click="toggleFold(row.id)">
              {{ folded[row.id] ? '展开正文' : '收起正文' }}
            </el-button>
            <span class="spacer"></span>
            <el-button size="small" :icon="View" @click="preview(row)">放大查看</el-button>
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
        </article>
      </div>

      <div class="footer-bar">
        <div class="footer-actions">
          <el-button type="primary" :icon="Download" :disabled="!picked.length" @click="doExport">
            导出 PDF（已选 {{ picked.length }} 条）
          </el-button>
          <el-button text :disabled="!picked.length" @click="picked = []">清空选择</el-button>
        </div>
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="load"
          @size-change="onFilter"
        />
      </div>
    </el-card>

    <!-- 放大查看：正文较长时比卡片内更舒服 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewData?.title || '预览'"
      width="760px"
      top="5vh"
    >
      <div v-if="previewData?.summary" class="preview-summary">摘要：{{ previewData.summary }}</div>
      <RichContent :html="previewData?.content || ''" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Delete,
  Download,
  Edit,
  Expand,
  Fold,
  FolderOpened,
  Plus,
  Search,
  View
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConclusions, deleteConclusion, updateConclusionStatus } from '../../api/conclusion'
import { getCategories } from '../../api/category'
import { printHtml, escapeHtml, PAPER_FONT } from '../../utils/printHtml'
import { formatDateTime } from '../../utils/format'
import RichContent from '../../components/RichContent.vue'
import type { Conclusion, KnowledgeCategory } from '../../types'

const router = useRouter()

const list = ref<Conclusion[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive({
  categoryId: undefined as number | undefined,
  status: '',
  keyword: '',
  page: 1,
  pageSize: 20
})

// 勾选导出（卡片没有表格选择器，这里自己维护 id 集合）
const picked = ref<number[]>([])
const pickedRows = computed(() => list.value.filter((r) => picked.value.includes(r.id)))
const togglePick = (id: number) => {
  picked.value = picked.value.includes(id)
    ? picked.value.filter((x) => x !== id)
    : [...picked.value, id]
}

// 正文折叠：默认全部展开（这个页面就是用来直接看内容的），可一键收起快速扫标题
const folded = reactive<Record<number, boolean>>({})
const expandAll = computed(() => list.value.length > 0 && list.value.every((r) => !folded[r.id]))
const toggleFold = (id: number) => {
  folded[id] = !folded[id]
}
const toggleAllFolds = () => {
  const target = !expandAll.value // 展开状态时点一下=全部收起
  for (const r of list.value) folded[r.id] = target
}

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
    // 换页/筛选后，把已不在当前页的勾选清掉，避免「已选 N 条」与实际不符
    const ids = new Set(list.value.map((r) => r.id))
    picked.value = picked.value.filter((id) => ids.has(id))
  } finally {
    loading.value = false
  }
}

const onFilter = () => {
  query.page = 1
  load()
}

const goPublish = () => router.push('/conclusions')
const goEdit = (id: number) => router.push(`/conclusions/edit/${id}`)
const goCategories = () => router.push('/conclusions/categories')

const remove = async (row: Conclusion) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.title}」？此操作不可恢复。`, '删除结论确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await deleteConclusion(row.id)
  ElMessage.success('删除成功')
  // 删掉当页最后一条时回退一页，避免停在空页
  if (list.value.length === 1 && query.page > 1) query.page -= 1
  load()
}

const toggleStatus = async (row: Conclusion) => {
  const next = row.status === 'published' ? 'draft' : 'published'
  await updateConclusionStatus(row.id, next)
  ElMessage.success(next === 'published' ? '已发布' : '已撤下')
  load()
}

// —— 放大查看 ——
const previewVisible = ref(false)
const previewData = ref<Conclusion | null>(null)
const preview = (row: Conclusion) => {
  previewData.value = row
  previewVisible.value = true
}

// —— 导出 PDF（沿用原结论页的汇编模板）——
const doExport = async () => {
  const items = pickedRows.value
  if (!items.length) {
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
  const okFlag = printHtml(header, buildExportHtml(items, header))
  if (!okFlag) ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
}

const buildExportHtml = (items: Conclusion[], header: string) => {
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
    <div style="font-family:${PAPER_FONT};font-size:${fs}px;line-height:1.8;color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;">
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
.count {
  font-size: 13px;
  color: var(--ink-soft);
}
.spacer {
  flex: 1;
}
.filters {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 80px;
}
.cc {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.6);
  padding: 12px 14px 8px;
}
.cc-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.cc-check {
  margin-right: 2px;
}
.cc-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.5;
}
.cc-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.cc-summary {
  margin: 0 0 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--moss-soft);
  color: var(--moss-deep);
  font-size: 13px;
  line-height: 1.6;
}
.cc-body {
  position: relative;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink);
  padding: 2px 0 6px;
}
/* 收起态：只截断高度，用渐隐提示下面还有内容 */
.cc-body--folded {
  max-height: 148px;
  overflow: hidden;
}
.cc-body--folded::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44px;
  background: linear-gradient(transparent, rgba(255, 255, 255, 0.96));
  pointer-events: none;
}
.cc-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--hair);
}

.footer-bar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.footer-actions {
  display: flex;
  align-items: center;
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

/* Element Plus 默认给相邻按钮加 12px margin-left，会和 flex gap 叠加导致间距不匀；
   这里统一交给 gap 控制 */
.toolbar :deep(.el-button + .el-button),
.filters :deep(.el-button + .el-button),
.footer-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
/* 卡片底部操作按钮：主操作靠右，删除单独留一点间隔 */
.cc-foot :deep(.el-button + .el-button) {
  margin-left: 0;
}
.cc-foot :deep(.el-button--danger) {
  margin-left: 4px;
}
</style>
