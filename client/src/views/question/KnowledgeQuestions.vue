<template>
  <el-card>
    <div class="toolbar">
      <el-button link type="primary" :icon="ArrowLeft" @click="goBack">返回题库</el-button>
      <span class="title">{{ tagLabel }}</span>
      <el-tooltip
        v-if="tag !== '__empty__'"
        content="重命名题库"
        placement="top"
        :show-after="400"
      >
        <el-icon class="toolbar-rename" @click="renameCurrentTag"><EditPen /></el-icon>
      </el-tooltip>
      <span class="count">共 {{ total }} 题</span>
    </div>

    <div class="filters">
      <el-radio-group v-model="type" @change="search">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="choice">选择题</el-radio-button>
        <el-radio-button value="fill">填空题</el-radio-button>
        <el-radio-button value="solve">解答题</el-radio-button>
      </el-radio-group>
      <el-select
        v-model="difficulty"
        placeholder="难度"
        clearable
        style="width: 120px"
        @change="search"
      >
        <el-option v-for="n in 5" :key="n" :label="`${n} 星`" :value="n" />
      </el-select>
      <div class="filters__actions">
        <span class="export-opt">含答案 <el-switch v-model="showAnswer" /></span>
        <span class="export-opt">答题留白 <el-switch v-model="showAnswerArea" /></span>
        <el-input-number
          v-if="showAnswerArea"
          v-model="answerAreaHeight"
          :min="20"
          :max="500"
          :step="20"
          size="small"
          style="width: 100px"
        />
        <el-tooltip content="打印时请在「更多设置」中取消勾选「页眉和页脚」" placement="top">
          <el-button type="primary" :icon="Download" @click="doExport">导出 PDF</el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="sub-filters" :class="{ dragging: dragId !== null }">
      <span class="sub-filters__label">二级知识点</span>
      <span
        class="sub-chip"
        :class="{ active: subTag === '' }"
        @click="selectSubTag('')"
      >全部</span>
      <span
        v-for="s in subTags"
        :key="s.name"
        class="sub-chip"
        :class="{ active: subTag === s.name }"
        @click="selectSubTag(s.name)"
        @dragover.prevent
        @drop.prevent="onDropTo(s.name)"
      >
        {{ s.name }}（{{ s.total }}）
        <span
          class="sub-chip__edit"
          title="编辑该二级知识点（重命名 / 合并 / 删除）"
          @click.stop="openSubEdit(s)"
        >
          <EditPen />
        </span>
      </span>
      <span
        class="sub-chip sub-chip--empty"
        :class="{ active: subTag === '__empty__' }"
        @click="selectSubTag('__empty__')"
        @dragover.prevent
        @drop.prevent="onDropTo(null)"
      >未分类</span>
      <span v-if="dragId !== null" class="sub-filters__drag-tip">
        松开鼠标即可将题目归入该二级知识点
      </span>
      <span v-else-if="!subTags.length" class="sub-filters__drag-tip">
        暂无二级知识点——可直接在题目行「二级知识点」下拉框输入名称新建
      </span>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="归类" width="64" align="center">
        <template #default="{ row }">
          <span
            class="drag-handle"
            draggable="true"
            :title="subTags.length ? '按住拖拽到上方「二级知识点」处归类' : '可直接编辑下方下拉框归类'"
            @dragstart="onDragStart($event, row)"
            @dragend="onDragEnd"
          >
            <Rank />
          </span>
        </template>
      </el-table-column>
      <el-table-column label="题干" min-width="240">
        <template #default="{ row }">
          <RichContent class="q-preview" :html="row.title || ''" />
        </template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="80" />
      <el-table-column label="二级知识点" width="190">
        <template #default="{ row }">
          <el-select
            :model-value="row.knowledgeSubTag || ''"
            size="small"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="未分类"
            @change="(v: any) => onSubTagEdit(row, v)"
          >
            <el-option v-for="s in subTags" :key="s.name" :label="s.name" :value="s.name" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="load"
      />
    </div>
  </el-card>

  <QuestionFormDialog v-model="editVisible" :question="editing" @saved="onEditedSaved" />

  <SubTagEditDialog
    v-model="subEditVisible"
    :sub-name="subEditTarget.name"
    :total="subEditTarget.total"
    :knowledge-tag="tag"
    :siblings="subTags"
    @saved="onSubTagSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ArrowLeft, Download, Edit, Delete, Rank, EditPen } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getQuestions,
  getQuestionSubTags,
  updateQuestion,
  deleteQuestion,
  renameQuestionTag
} from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'
import SubTagEditDialog from '../../components/SubTagEditDialog.vue'
import RichContent from '../../components/RichContent.vue'
import type { Question } from '../../types'
import { printHtml, PAPER_FONT } from '../../utils/printHtml'
import { questionTypeLabel as typeLabel, escapeHtml } from '../../utils/format'

const route = useRoute()
const router = useRouter()

// 知识点标识：路由参数；__empty__ 表示「未分类」
const tag = computed(() => String(route.params.tag || ''))
const tagLabel = computed(() => (tag.value === '__empty__' ? '未分类' : tag.value))

const list = ref<Question[]>([])
const loading = ref(false)
const type = ref('all')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const difficulty = ref<number>()
const editVisible = ref(false)
const editing = ref<any>(null)
const showAnswer = ref(false)
const showAnswerArea = ref(false)
const answerAreaHeight = ref(100)

// —— 二级知识点筛选 ——
const subTag = ref('')
const subTags = ref<{ name: string; total: number }[]>([])

// —— 二级知识点编辑（重命名 / 合并 / 删除 / 换题库）——
const subEditVisible = ref(false)
const subEditTarget = ref<{ name: string; total: number }>({ name: '', total: 0 })

const openSubEdit = (s: { name: string; total: number }) => {
  subEditTarget.value = { name: s.name, total: s.total }
  subEditVisible.value = true
}

// 编辑完成后刷新列表与二级候选；若当前正在筛选的二级被改名/删除，跟随切换到新名称
const onSubTagSaved = async (payload?: { name?: string }) => {
  const oldName = subEditTarget.value.name
  await Promise.all([loadSubTags(), load()])
  if (oldName && subTag.value === oldName) {
    const next = payload?.name
    subTag.value = next && subTags.value.some((s) => s.name === next) ? next : ''
    await load()
  }
}

// 加载当前一级知识点下的二级知识点（带题量）
const loadSubTags = async () => {
  try {
    subTags.value = await getQuestionSubTags(tag.value)
  } catch {
    subTags.value = []
  }
}

// 从路由 ?sub= 初始化二级筛选（仅在进入页面/切换一级时调用）
const applyRouteSub = () => {
  const initSub = route.query.sub ? String(route.query.sub) : ''
  subTag.value = initSub && subTags.value.some((s) => s.name === initSub) ? initSub : ''
}

// 点击芯片筛选（'' = 全部，'__empty__' = 未分类）
const selectSubTag = (name: string) => {
  subTag.value = name
  search()
}

// —— 归类操作：拖拽投放 / 行内下拉直接编辑 ——
const dragId = ref<number | null>(null)

const assignSubTag = async (questionId: number, subName: string | null) => {
  await updateQuestion(questionId, { knowledgeSubTag: subName })
  ElMessage.success(subName ? `已归入「${subName}」` : '已移回未分类')
  await Promise.all([loadSubTags(), load()])
}

const onDragStart = (e: DragEvent, row: any) => {
  dragId.value = row.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(row.id))
  }
}

const onDragEnd = () => {
  dragId.value = null
}

// 拖到某个二级芯片上（null 表示拖到「未分类」，即清除归类）
const onDropTo = async (subName: string | null) => {
  const id = dragId.value
  dragId.value = null
  if (id == null) return
  try {
    await assignSubTag(id, subName)
  } catch {
    // 错误提示已由 request.ts 统一弹出
  }
}

// 行内下拉直接编辑（可选已有二级，或输入新名称创建）
const onSubTagEdit = async (row: any, value: any) => {
  const name = value != null && String(value).trim() ? String(value).trim() : null
  try {
    await assignSubTag(row.id, name)
  } catch {
    // 错误提示已由 request.ts 统一弹出
  }
}

// 生成知识点题目集 HTML（打印用）
const buildQuestionsHtml = (questions: any[], withAnswer: boolean) => {
  const fs = 16
  const subLabel = subTag.value === '__empty__' ? '未分类' : subTag.value
  const title = subLabel
    ? `${tagLabel.value} › ${subLabel} · 题目集`
    : `${tagLabel.value} · 题目集`
  const renderOpts = (q: any) =>
    q.options && Array.isArray(q.options)
      ? `<div style="margin:6px 0 0 22px;">${q.options
          .map(
            (o: any, j: number) =>
              `<div style="margin:2px 0;">${String.fromCharCode(65 + j)}. ${escapeHtml(
                typeof o === 'string' ? o : JSON.stringify(o)
              )}</div>`
          )
          .join('')}</div>`
      : ''
  const body = questions
    .map(
      (q, i) => `
      <div style="margin-bottom:18px;page-break-inside:avoid;">
        <div style="margin-bottom:4px;">
          <span style="font-weight:700;">${i + 1}.</span>
          <span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">【${escapeHtml(typeLabel(q.type))}】</span>
          ${q.difficulty ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">难度 ${q.difficulty} 星</span>` : ''}
        </div>
        <div>${q.title || ''}</div>
        ${renderOpts(q)}
        ${q.body ? `<div style="margin-top:4px;">${q.body}</div>` : ''}
        ${showAnswerArea.value ? `<div style="height:${answerAreaHeight.value}px;"></div>` : ''}
        ${withAnswer && q.answer ? `<div style="color:#c0392b;margin-top:6px;"><b>【答案与解析】</b>${q.answer}</div>` : ''}
      </div>`
    )
    .join('')
  return `<div style="font-family:${PAPER_FONT};font-size:${fs}px;line-height:1.8;color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;">
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      <div style="font-size:${fs + 6}px;font-weight:700;">${escapeHtml(title)}</div>
      <div style="font-size:${fs - 2}px;color:#555;margin-top:6px;">共 ${questions.length} 题${withAnswer ? '（含答案）' : ''}</div>
    </div>
    ${body}
  </div>`
}

// 导出当前筛选下的全部题目为 PDF（打印方式）
const doExport = async () => {
  const params: any = { knowledgeTag: tag.value }
  if (subTag.value === '__empty__') params.knowledgeSubTag = '__empty__'
  else if (subTag.value) params.knowledgeSubTag = subTag.value
  const all = await getQuestions(params)
  if (!all.length) {
    ElMessage.warning('当前筛选下没有题目')
    return
  }
  const subLabel = subTag.value === '__empty__' ? '未分类' : subTag.value
  const okFlag = printHtml(
    `${subLabel ? tagLabel.value + ' › ' + subLabel : tagLabel.value} · 题目集`,
    buildQuestionsHtml(all, showAnswer.value)
  )
  if (!okFlag) ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
}

const load = async () => {
  loading.value = true
  try {
    const params: any = { knowledgeTag: tag.value, page: page.value, pageSize }
    if (type.value !== 'all') params.type = type.value
    if (difficulty.value != null) params.difficulty = difficulty.value
    if (subTag.value === '__empty__') params.knowledgeSubTag = '__empty__'
    else if (subTag.value) params.knowledgeSubTag = subTag.value
    const res = await getQuestions(params)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => {
  page.value = 1
  load()
}

const goBack = () => router.push('/questions')

// 重命名当前题库（一级知识点），成功后跳转到新名称的页面
const renameCurrentTag = async () => {
  if (tag.value === '__empty__') return
  try {
    const { value } = await ElMessageBox.prompt(
      `重命名题库「${tagLabel.value}」（共 ${total.value} 道题）：`,
      '重命名题库',
      {
        inputValue: tag.value,
        inputPlaceholder: '新题库名称',
        inputValidator: (v) => (v && v.trim() ? true : '名称不能为空'),
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    const to = value.trim()
    if (!to || to === tag.value) return
    await renameQuestionTag(tag.value, to)
    ElMessage.success(`已重命名为「${to}」`)
    router.replace(`/questions/knowledge/${encodeURIComponent(to)}`)
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    // 其它错误已由 request.ts 统一提示
  }
}

const openEdit = (row: any) => {
  editing.value = row
  editVisible.value = true
}

// 编辑保存后：刷新列表 + 二级知识点计数（题目可能改了知识点归属）
const onEditedSaved = async () => {
  await Promise.all([load(), loadSubTags()])
}

const remove = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除该题目？`, '提示', { type: 'warning' })
  } catch {
    return // 用户取消
  }
  try {
    await deleteQuestion(row.id)
    ElMessage.success('删除成功')
    // 删除末页最后一条时回退页码，避免停留在空白页
    if (page.value > 1 && list.value.length <= 1) page.value -= 1
    // 同步刷新列表与顶部二级知识点题量计数
    await Promise.all([load(), loadSubTags()])
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('删除失败', err)
  }
}

onMounted(async () => {
  await loadSubTags()
  applyRouteSub()
  load()
})

// 在题库页切换一级知识点时（同路由实例复用）刷新数据与二级候选
watch(
  () => route.params.tag,
  async () => {
    subTag.value = ''
    await loadSubTags()
    applyRouteSub()
    load()
  }
)
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
  color: var(--ink-soft);
  font-size: 13px;
}
.toolbar-rename {
  cursor: pointer;
  color: var(--ink-soft);
  font-size: 16px;
  padding: 4px;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}
.toolbar-rename:hover {
  color: var(--moss-deep);
  background: var(--moss-soft);
}
/* 题干预览：渲染富文本与 LaTeX 公式，最多两行，超出隐藏（完整内容见编辑弹窗） */
.q-preview {
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.q-preview :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}
.filters {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sub-filters {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sub-filters__label {
  font-size: 13px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.sub-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  line-height: 1;
  color: var(--ink-soft);
  background: var(--paper-deep);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.sub-chip:hover {
  border-color: var(--moss);
  color: var(--moss-deep);
}
.sub-chip.active {
  background: var(--moss);
  border-color: var(--moss);
  color: #fffdf9;
  font-weight: 600;
}
/* 二级知识点编辑入口：平时淡隐，鼠标悬停到芯片上才显现，避免干扰筛选点击 */
.sub-chip__edit {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  opacity: 0;
  cursor: pointer;
  border-radius: 4px;
  transition: opacity 0.15s ease;
}
.sub-chip:hover .sub-chip__edit {
  opacity: 0.7;
}
.sub-chip__edit:hover {
  opacity: 1;
}
.sub-chip--empty {
  border-style: dashed;
}
/* 拖拽中：所有芯片显示为可投放目标，悬停高亮 */
.sub-filters.dragging .sub-chip {
  border-style: dashed;
  border-color: var(--moss);
}
.sub-filters.dragging .sub-chip:hover {
  background: var(--moss);
  border-style: solid;
  color: #fffdf9;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(91, 125, 116, 0.3);
}
.sub-filters__drag-tip {
  font-size: 12px;
  color: var(--moss-deep);
}
/* 拖拽手柄 */
.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--ink-soft);
  font-size: 16px;
  padding: 4px 6px;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}
.drag-handle:hover {
  color: var(--moss-deep);
  background: var(--moss-soft);
}
.drag-handle:active {
  cursor: grabbing;
}
.filters__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}
.export-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #555;
  font-size: 13px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
