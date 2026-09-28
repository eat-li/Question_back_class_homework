<template>
  <div class="handout">
    <!-- 顶栏：历史讲义 / 新建 / 标题 / 保存 / 导出 -->
    <div class="topbar">
      <div class="topbar-side">
        <el-select
          v-model="savedId"
          class="saved-select"
          placeholder="加载已保存讲义"
          clearable
          size="default"
          @change="onPickSaved"
        >
          <el-option v-for="h in savedList" :key="h.id" :label="h.title" :value="h.id">
            <span class="saved-option">{{ h.title }}</span>
            <span class="saved-option__date">{{ formatDate(h.updatedAt || h.createdAt) }}</span>
          </el-option>
        </el-select>
        <el-button @click="resetBuilder">新建</el-button>
        <el-button v-if="editingId" type="danger" plain :icon="Delete" @click="removeSaved"
          >删除</el-button
        >
      </div>
      <input
        v-model="title"
        class="title-input"
        :placeholder="editingId ? '讲义标题' : '输入讲义标题，如：第三讲·圆锥曲线小结论'"
        maxlength="200"
      />
      <div class="topbar-side topbar-side--right">
        <span v-if="editingId" class="save-state">已保存</span>
        <el-button type="primary" :loading="saving" @click="save">保存讲义</el-button>
        <el-button type="primary" plain :icon="Download" @click="doExport">导出 PDF</el-button>
      </div>
    </div>

    <div class="split">
      <!-- 左栏：素材选取（已选内容的排序管理走弹窗，见页面底部） -->
      <aside class="left">
        <div class="picked-bar">
          <span class="picked-bar__stat">
            已选内容 <b>{{ items.length }}</b> 项
            <em>{{ pickedStat }}</em>
          </span>
          <el-button size="small" :icon="Tickets" @click="pickedVisible = true"
            >查看 / 排序</el-button
          >
        </div>
        <div class="pool">
          <el-tabs v-model="poolTab" class="pool-tabs">
            <!-- 题目素材 -->
            <el-tab-pane label="题目" name="question">
              <div class="pool-filters">
                <el-input
                  v-model="qKeyword"
                  placeholder="按题干搜索"
                  clearable
                  @keyup.enter="qSearch"
                  @clear="qSearch"
                />
                <el-select v-model="qType" placeholder="题型" clearable @change="qSearch">
                  <el-option label="选择题" value="choice" />
                  <el-option label="填空题" value="fill" />
                  <el-option label="解答题" value="solve" />
                </el-select>
                <el-select
                  v-model="qTag"
                  placeholder="知识点"
                  clearable
                  filterable
                  @change="qSearch"
                >
                  <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
                </el-select>
              </div>
              <div v-loading="qLoading" class="pool-list">
                <el-empty v-if="!qLoading && !qRows.length" description="没有符合条件的题目" />
                <div
                  v-for="row in qRows"
                  :key="row.id"
                  class="pool-row"
                  :class="{ 'is-picked': hasItem('question', row.id) }"
                  @click="toggleQuestion(row)"
                >
                  <RichContent class="pool-row__title" :html="row.title || ''" />
                  <div class="pool-row__meta">
                    <span>{{ typeLabel(row.type) }}</span>
                    <span class="stars">{{ '★'.repeat(row.difficulty || 0) || '—' }}</span>
                    <span v-if="row.knowledgeTag" class="kp">{{
                      row.knowledgeTag + (row.knowledgeSubTag ? ' › ' + row.knowledgeSubTag : '')
                    }}</span>
                    <span class="pool-row__action">{{
                      hasItem('question', row.id) ? '移除' : '添加'
                    }}</span>
                  </div>
                </div>
              </div>
              <div v-if="qTotal > qPageSize" class="pool-pager">
                <el-pagination
                  v-model:current-page="qPage"
                  :page-size="qPageSize"
                  :total="qTotal"
                  layout="prev, pager, next"
                  small
                  background
                  @current-change="loadQuestionPool"
                />
              </div>
            </el-tab-pane>

            <!-- 结论素材 -->
            <el-tab-pane label="结论" name="conclusion">
              <div class="pool-filters">
                <el-input
                  v-model="cKeyword"
                  placeholder="按标题/摘要/标签搜索"
                  clearable
                  @keyup.enter="cSearch"
                  @clear="cSearch"
                />
                <el-select
                  v-model="cCategory"
                  placeholder="知识点分类"
                  clearable
                  filterable
                  @change="cSearch"
                >
                  <el-option
                    v-for="c in flatCategories"
                    :key="c.id"
                    :label="c.label"
                    :value="c.id"
                  />
                </el-select>
              </div>
              <div v-loading="cLoading" class="pool-list">
                <el-empty v-if="!cLoading && !cRows.length" description="没有符合条件的结论" />
                <div
                  v-for="row in cRows"
                  :key="row.id"
                  class="pool-row"
                  :class="{ 'is-picked': hasItem('conclusion', row.id) }"
                  @click="toggleConclusion(row)"
                >
                  <div class="pool-row__name">{{ row.title }}</div>
                  <div class="pool-row__meta">
                    <span class="kp">{{ row.category?.name || '未分类' }}</span>
                    <span class="pool-row__action">{{
                      hasItem('conclusion', row.id) ? '移除' : '添加'
                    }}</span>
                  </div>
                </div>
              </div>
              <div v-if="cTotal > cPageSize" class="pool-pager">
                <el-pagination
                  v-model:current-page="cPage"
                  :page-size="cPageSize"
                  :total="cTotal"
                  layout="prev, pager, next"
                  small
                  background
                  @current-change="loadConclusionPool"
                />
              </div>
            </el-tab-pane>

            <!-- 知识点素材（整块插入：标题 + 下属结论） -->
            <el-tab-pane label="知识点" name="knowledge">
              <p class="kp-hint">
                点击整块插入「知识点标题 + 该分类（含子分类）下全部结论」；显示 0
                条的分类暂无可插入内容
              </p>
              <div v-loading="kLoading" class="pool-list">
                <el-empty
                  v-if="!kLoading && !flatCategories.length"
                  description="还没有知识点分类"
                />
                <div
                  v-for="c in flatCategories"
                  :key="c.id"
                  class="pool-row pool-row--kp"
                  :class="{
                    'is-picked': hasItem('knowledge', c.id),
                    'is-empty': !kpCount[c.id]
                  }"
                  :style="{ paddingLeft: 10 + c.level * 18 + 'px' }"
                  @click="toggleKnowledge(c)"
                >
                  <div class="pool-row__name">
                    <span v-if="c.level > 0" class="kp-tree-mark">└</span>{{ c.name }}
                    <span class="kp-count">{{ kpCount[c.id] || 0 }} 条结论</span>
                  </div>
                  <span
                    v-if="kpCount[c.id] || hasItem('knowledge', c.id)"
                    class="pool-row__action"
                    >{{ hasItem('knowledge', c.id) ? '移除' : '添加' }}</span
                  >
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </aside>

      <!-- 右栏：打印样式实时预览 -->
      <section class="right">
        <div class="options-bar">
          <label class="opt"><el-switch v-model="layout.showAnswer" />显示答案</label>
          <label class="opt"><el-switch v-model="layout.showType" />显示题型</label>
          <label class="opt"><el-switch v-model="layout.showKnowledge" />知识点标签</label>
          <label class="opt"><el-switch v-model="layout.showNameLine" />姓名/年级栏</label>
          <label class="opt"><el-switch v-model="layout.showSchool" />学校</label>
          <el-input
            v-model="layout.schoolName"
            size="small"
            placeholder="学校名称（页眉显示）"
            class="opt-school"
            :disabled="!layout.showSchool"
          />
          <span class="opt-group">
            字号
            <el-radio-group v-model="layout.fontSize" size="small">
              <el-radio-button value="14">小</el-radio-button>
              <el-radio-button value="16">中</el-radio-button>
              <el-radio-button value="18">大</el-radio-button>
            </el-radio-group>
          </span>
          <span class="opt-group">
            行距
            <el-radio-group v-model="layout.lineHeight" size="small">
              <el-radio-button value="1.6">紧凑</el-radio-button>
              <el-radio-button value="1.8">正常</el-radio-button>
              <el-radio-button value="2.2">宽松</el-radio-button>
            </el-radio-group>
          </span>
          <span class="opt-group">
            内容宽度
            <el-radio-group v-model="layout.contentWidth" size="small">
              <el-radio-button value="160">窄</el-radio-button>
              <el-radio-button value="180">标准</el-radio-button>
              <el-radio-button value="200">宽</el-radio-button>
              <el-radio-button value="full">满宽</el-radio-button>
            </el-radio-group>
          </span>
          <span class="opt-group">
            题间距离
            <el-radio-group v-model="layout.gapItem" size="small">
              <el-radio-button value="none">无</el-radio-button>
              <el-radio-button value="tight">紧</el-radio-button>
              <el-radio-button value="normal">正常</el-radio-button>
              <el-radio-button value="loose">松</el-radio-button>
            </el-radio-group>
          </span>
          <span class="opt-group">
            行内间距
            <el-radio-group v-model="layout.gapInner" size="small">
              <el-radio-button value="none">无</el-radio-button>
              <el-radio-button value="tight">紧</el-radio-button>
              <el-radio-button value="normal">正常</el-radio-button>
              <el-radio-button value="loose">松</el-radio-button>
            </el-radio-group>
          </span>
          <span class="opt-group">
            区块间距
            <el-radio-group v-model="layout.gapSection" size="small">
              <el-radio-button value="none">无</el-radio-button>
              <el-radio-button value="tight">紧</el-radio-button>
              <el-radio-button value="normal">正常</el-radio-button>
              <el-radio-button value="loose">松</el-radio-button>
            </el-radio-group>
          </span>
          <el-button size="small" text :icon="RefreshLeft" @click="resetLayout">恢复默认</el-button>
        </div>
        <div class="preview-scroll">
          <div v-if="!items.length" class="preview-empty">
            <el-empty description="左侧添加内容后，这里会实时显示打印效果" />
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-else
            class="paper"
            :style="{ maxWidth: paperWidthPx + 'px' }"
            v-html="previewHtml"
          ></div>
        </div>
      </section>
    </div>

    <!-- 已选内容：独立弹窗（排序/移除实时回流到右侧预览） -->
    <HandoutPickedDialog
      v-model="pickedVisible"
      :rows="pickedRows"
      @move="moveItem"
      @remove="removeItem"
      @clear="items = []"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Tickets, RefreshLeft } from '@element-plus/icons-vue'
import {
  getHandouts,
  getHandout,
  getHandoutItems,
  createHandout,
  updateHandout,
  deleteHandout,
  type Handout,
  type HandoutItem,
  type HandoutItemType,
  type KnowledgeBlock
} from '../../api/handout'
import { getQuestions, getQuestionTags } from '../../api/question'
import { getConclusions } from '../../api/conclusion'
import { getCategories } from '../../api/category'
import RichContent from '../../components/RichContent.vue'
import HandoutPickedDialog, {
  type HandoutPickedRow
} from '../../components/HandoutPickedDialog.vue'
import { printHtml, PAPER_FONT } from '../../utils/printHtml'
import { renderMathInHtml } from '../../utils/mathRender'
import { sanitizeHtml, sanitizeRichHtml } from '../../utils/sanitizeHtml'
import { escapeHtml } from '../../utils/format'
import type { Question, Conclusion, KnowledgeCategory } from '../../types'

/* ===================== 基础状态 ===================== */
const route = useRoute()
const router = useRouter()
const editingId = ref<number | null>(null)
const title = ref('')
const saving = ref(false)
const items = ref<HandoutItem[]>([])

// 内容详情缓存：预览时按 id 取完整数据
const questionMap = reactive(new Map<number, Question>())
const conclusionMap = reactive(new Map<number, Conclusion>())
const knowledgeMap = reactive(new Map<number, KnowledgeBlock>())

const typeMap: Record<string, string> = { choice: '选择题', fill: '填空题', solve: '解答题' }
const typeLabel = (t: string) => typeMap[t] || t
const typeName = (t: HandoutItemType) =>
  ({ question: '题目', conclusion: '结论', knowledge: '知识点' })[t]
const tagType = (t: HandoutItemType) =>
  ({ question: 'primary', conclusion: 'success', knowledge: 'warning' })[t] as any

const hasItem = (type: HandoutItemType, id: number) =>
  items.value.some((it) => it.type === type && it.id === id)

const pickedStat = computed(() => {
  const n = (t: HandoutItemType) => items.value.filter((it) => it.type === t).length
  return `题目 ${n('question')} · 结论 ${n('conclusion')} · 知识点 ${n('knowledge')}`
})

// 已选内容的展示数据：交给 HandoutPickedDialog 渲染（题目走富文本，其余纯文本）
const pickedVisible = ref(false)
const pickedRows = computed<HandoutPickedRow[]>(() =>
  items.value.map((it) => {
    const base = {
      key: `${it.type}-${it.id}`,
      typeName: typeName(it.type),
      tagType: tagType(it.type)
    }
    if (it.type === 'question') {
      const q = questionMap.get(it.id)
      return {
        ...base,
        html: q ? String(q.title ?? '') : '',
        plain: q ? '' : '（题目已不存在，请移除）',
        sub: q ? [typeLabel(q.type), q.knowledgeTag].filter(Boolean).join(' · ') : ''
      }
    }
    if (it.type === 'conclusion') {
      const c = conclusionMap.get(it.id)
      return {
        ...base,
        plain: c?.title || '（结论已不存在，请移除）',
        sub: c?.category?.name || ''
      }
    }
    const k = knowledgeMap.get(it.id)
    return {
      ...base,
      plain: k?.name || '（分类已不存在，请移除）',
      sub: k ? `含 ${k.conclusions.length} 条结论` : ''
    }
  })
)

const formatDate = (d?: string | null) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}-${date.getDate()}`
}

/* ===================== 素材池：题目 ===================== */
const poolTab = ref('question')
const qKeyword = ref('')
const qType = ref('')
const qTag = ref('')
const tagOptions = ref<string[]>([])
const qRows = ref<Question[]>([])
const qLoading = ref(false)
const qPage = ref(1)
const qPageSize = 8
const qTotal = ref(0)

const loadQuestionPool = async () => {
  qLoading.value = true
  try {
    const params: any = {
      keyword: qKeyword.value,
      type: qType.value,
      page: qPage.value,
      pageSize: qPageSize
    }
    if (qTag.value) params.knowledgeTag = qTag.value
    const res = await getQuestions(params)
    qRows.value = res.list
    qTotal.value = res.total
  } finally {
    qLoading.value = false
  }
}
const qSearch = () => {
  qPage.value = 1
  loadQuestionPool()
}

const toggleQuestion = (row: Question) => {
  if (hasItem('question', row.id)) {
    removeById('question', row.id)
    return
  }
  questionMap.set(row.id, row)
  items.value.push({ type: 'question', id: row.id })
}

/* ===================== 素材池：结论 ===================== */
const cKeyword = ref('')
const cCategory = ref<number | null>(null)
const cRows = ref<Conclusion[]>([])
const cLoading = ref(false)
const cPage = ref(1)
const cPageSize = 8
const cTotal = ref(0)

const loadConclusionPool = async () => {
  cLoading.value = true
  try {
    const res = await getConclusions({
      keyword: cKeyword.value || undefined,
      categoryId: cCategory.value || undefined,
      page: cPage.value,
      pageSize: cPageSize
    })
    cRows.value = res.list
    cTotal.value = res.total
  } finally {
    cLoading.value = false
  }
}
const cSearch = () => {
  cPage.value = 1
  loadConclusionPool()
}

const toggleConclusion = (row: Conclusion) => {
  if (hasItem('conclusion', row.id)) {
    removeById('conclusion', row.id)
    return
  }
  conclusionMap.set(row.id, row)
  items.value.push({ type: 'conclusion', id: row.id })
}

/* ===================== 素材池：知识点 ===================== */
const categories = ref<KnowledgeCategory[]>([])
const kLoading = ref(false)

// 树形分类拍平为带层级的行，结论筛选下拉与知识点池共用
interface FlatCategory {
  id: number
  name: string
  label: string
  level: number
}
const flatCategories = ref<FlatCategory[]>([])

const flattenCategories = (nodes: KnowledgeCategory[], level = 0, parentLabel = '') => {
  const out: FlatCategory[] = []
  for (const n of nodes) {
    const label = parentLabel ? `${parentLabel} / ${n.name}` : n.name
    out.push({ id: n.id, name: n.name, label, level })
    if (n.children?.length) out.push(...flattenCategories(n.children, level + 1, label))
  }
  return out
}

// 知识点池里每个分类下面有多少条结论（含子分类），用来判断「能不能插入」
const kpCount = ref<Record<number, number>>({})

const loadCategories = async () => {
  kLoading.value = true
  try {
    categories.value = await getCategories()
    flatCategories.value = flattenCategories(categories.value)
    await loadKpCounts()
  } finally {
    kLoading.value = false
  }
}

// 逐分类拉一次结论总数（pageSize=1 只取 total），用于提示「该知识点下暂无可插入的结论」
const loadKpCounts = async () => {
  const rows = await Promise.all(
    flatCategories.value.map((c) =>
      getConclusions({ categoryId: c.id, page: 1, pageSize: 1 })
        .then((r) => [c.id, r.total] as const)
        .catch(() => [c.id, 0] as const)
    )
  )
  const counts: Record<number, number> = {}
  rows.forEach(([id, total]) => (counts[id] = total))
  // 父分类的总数 = 自身 + 后代（用已拍平的层级关系累加）
  const withDescendants: Record<number, number> = { ...counts }
  for (const c of [...flatCategories.value].reverse()) {
    if (c.level === 0) continue
    const parent = flatCategories.value
      .slice(0, flatCategories.value.indexOf(c))
      .reverse()
      .find((p) => p.level === c.level - 1)
    if (parent) withDescendants[parent.id] = (withDescendants[parent.id] || 0) + (counts[c.id] || 0)
  }
  kpCount.value = withDescendants
}

const toggleKnowledge = async (c: FlatCategory) => {
  if (hasItem('knowledge', c.id)) {
    removeById('knowledge', c.id)
    return
  }
  if (!kpCount.value[c.id]) {
    ElMessage.warning('该知识点下还没有结论，先去「结论」里补充后再插入')
    return
  }
  kLoading.value = true
  try {
    // 取分类 + 全部后代分类下的结论。翻页拉取直到取完，
    // 避免结论数超过单页上限时只带入前 100 条。
    const ids: number[] = []
    const collect = (nodes: KnowledgeCategory[], within: boolean) => {
      for (const n of nodes) {
        const hit = within || n.id === c.id
        if (hit) ids.push(n.id)
        if (n.children?.length) collect(n.children, hit)
      }
    }
    collect(categories.value, false)

    const all: Conclusion[] = []
    for (const cid of ids) {
      let p = 1
      for (;;) {
        const res = await getConclusions({ categoryId: cid, page: p, pageSize: 100 })
        all.push(...res.list)
        if (all.length >= res.total || !res.list.length) break
        p += 1
      }
    }
    knowledgeMap.set(c.id, { id: c.id, name: c.name, conclusions: all })
    items.value.push({ type: 'knowledge', id: c.id })
  } finally {
    kLoading.value = false
  }
}

/* ===================== 已选内容管理 ===================== */
const removeById = (type: HandoutItemType, id: number) => {
  items.value = items.value.filter((it) => !(it.type === type && it.id === id))
}
const removeItem = (idx: number) => {
  items.value.splice(idx, 1)
}
const moveItem = (idx: number, delta: number) => {
  const to = idx + delta
  if (to < 0 || to >= items.value.length) return
  const arr = items.value.slice()
  ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
  items.value = arr
}

/* ===================== 打印排版与预览 ===================== */
// 默认排版：只保留题目本身需要的信息（题型 + 知识点标签），
// 学生/学校等身份信息默认不出现在讲义上，需要时手动打开。
const layout = reactive({
  showAnswer: false,
  showType: true,
  showKnowledge: true,
  showNameLine: false,
  showSchool: false,
  fontSize: '16',
  lineHeight: '1.8',
  // 内容宽度（mm）：纸张内容区宽度，控制行宽与整体留白
  contentWidth: '180',
  // 题目之间 / 题目内部 / 知识点区块前后的间距档位（none|tight|normal|loose）
  gapItem: 'normal',
  gapInner: 'normal',
  gapSection: 'normal',
  schoolName: ''
})

// 间距档位 → 像素值（预览与导出共用）
const GAPS: Record<string, { item: number; inner: number; section: number }> = {
  none: { item: 4, inner: 0, section: 6 },
  tight: { item: 10, inner: 2, section: 14 },
  normal: { item: 16, inner: 4, section: 22 },
  loose: { item: 26, inner: 8, section: 34 }
}
const gap = computed(() => GAPS[layout.gapItem] || GAPS.normal)
const gapInner = computed(() => GAPS[layout.gapInner]?.inner ?? 4)
const gapSection = computed(() => GAPS[layout.gapSection]?.section ?? 22)

// 内容宽度同时决定纸张宽度：预览与导出所见即所得（按 96dpi 换算，1mm ≈ 3.7795px）
const paperWidthPx = computed(() =>
  layout.contentWidth === 'full' ? 1123 : Math.round(Number(layout.contentWidth) * 3.7795) + 56
)

// 恢复默认排版（间距与宽度回到出厂值，开关状态与学生信息保留）
const resetLayout = () => {
  layout.contentWidth = '180'
  layout.gapItem = 'normal'
  layout.gapInner = 'normal'
  layout.gapSection = 'normal'
  layout.fontSize = '16'
  layout.lineHeight = '1.8'
  ElMessage.success('已恢复默认排版')
}

const fillLine = (val?: string) =>
  `<span style="display:inline-block;min-width:80px;height:1.6em;line-height:1.6em;border:1px solid #666;border-radius:2px;padding:0 6px;vertical-align:middle;">${escapeHtml(val ?? '') || '&nbsp;'}</span>`

// 生成讲义纸 HTML：预览与导出共用，保证所见即所得
const buildHandoutHtml = () => {
  const fs = Number(layout.fontSize)
  const lh = layout.lineHeight
  const g = gap.value
  const gi = gapInner.value
  const gs = gapSection.value
  // 纸张宽度随内容宽度走（96dpi 换算），padding 28 与 CSS 里的 .paper 保持一致
  const paperW = paperWidthPx.value
  const paperStyle = `font-family:${PAPER_FONT};font-size:${fs}px;line-height:${lh};color:#222;padding:28px;max-width:${paperW}px;margin:0 auto;background:#fff;`
  const boxPadTop = Math.round(gs / 2)
  const boxPadBottom = Math.round(gs / 2)

  const header = `
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      ${layout.showSchool && layout.schoolName.trim() ? `<div style="font-size:${fs + 2}px;font-weight:600;letter-spacing:3px;">${escapeHtml(layout.schoolName.trim())}</div>` : ''}
      <div style="font-size:${fs + 6}px;font-weight:700;margin:6px 0;">${escapeHtml(title.value || '数学讲义')}</div>
      ${layout.showNameLine ? `<div style="font-size:${fs - 2}px;color:#555;text-align:left;padding:0 6px;">姓名：${fillLine('')}　年级：${fillLine('')}</div>` : ''}
    </div>`

  let qNo = 0
  const body = items.value
    .map((it) => {
      if (it.type === 'question') {
        const q = questionMap.get(it.id)
        if (!q) return ''
        qNo++
        const opts =
          q.options && Array.isArray(q.options)
            ? `<div style="margin:${gi ? gi + 6 : 0}px 0 0 22px;">${q.options
                .map(
                  (o: any, j: number) =>
                    `<div style="margin:${Math.max(0, gi - 2)}px 0;">${String.fromCharCode(65 + j)}. ${escapeHtml(
                      typeof o === 'string' ? o : JSON.stringify(o)
                    )}</div>`
                )
                .join('')}</div>`
            : ''
        return `
      <div style="margin-bottom:${g.item}px;page-break-inside:avoid;">
        <div style="margin-bottom:${gi}px;">
          <span style="font-weight:700;">${qNo}.</span>
          ${layout.showType ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">【${escapeHtml(typeLabel(q.type))}】</span>` : ''}
          ${layout.showKnowledge && q.knowledgeTag ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">${escapeHtml(q.knowledgeTag)}${q.knowledgeSubTag ? ' › ' + escapeHtml(q.knowledgeSubTag) : ''}</span>` : ''}
        </div>
        <div>${sanitizeRichHtml(String(q.title ?? ''))}</div>
        ${opts}
        ${q.body ? `<div style="margin-top:${gi}px;">${sanitizeRichHtml(String(q.body))}</div>` : ''}
        ${layout.showAnswer && q.answer ? `<div style="color:#c0392b;margin-top:${gi}px;"><b>【答案与解析】</b>${sanitizeRichHtml(String(q.answer))}</div>` : ''}
      </div>`
      }
      if (it.type === 'conclusion') {
        const c = conclusionMap.get(it.id)
        if (!c) return ''
        return `
      <div style="margin-bottom:${g.item}px;page-break-inside:avoid;">
        <div style="font-weight:700;margin-bottom:${gi}px;">${escapeHtml(c.title)}</div>
        <div>${sanitizeRichHtml(String(c.content ?? ''))}</div>
      </div>`
      }
      const k = knowledgeMap.get(it.id)
      if (!k) return ''
      const list = k.conclusions
        .map(
          (c) => `
        <div style="margin-bottom:${gi + 8}px;page-break-inside:avoid;">
          <div style="font-weight:700;margin-bottom:${gi}px;">${escapeHtml(c.title)}</div>
          <div>${sanitizeRichHtml(String(c.content ?? ''))}</div>
        </div>`
        )
        .join('')
      return `
      <div style="margin:${boxPadTop}px 0 ${boxPadBottom}px;padding-bottom:${gi ? gi + 2 : 0}px;border-bottom:1.5px solid #333;font-size:${fs + 2}px;font-weight:700;page-break-after:avoid;">
        知识点：${escapeHtml(k.name)}
      </div>${list || '<p style="color:#999;">（该分类下暂无结论）</p>'}`
    })
    .join('')

  return `<div style="${paperStyle}">${header}${body || ''}</div>`
}

const previewHtml = computed(() =>
  items.value.length ? renderMathInHtml(sanitizeHtml(buildHandoutHtml())) : ''
)

const doExport = () => {
  if (!items.value.length) {
    ElMessage.warning('请先添加讲义内容')
    return
  }
  const okFlag = printHtml(title.value || '讲义', buildHandoutHtml())
  if (!okFlag) ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
}

/* ===================== 保存 / 加载 / 删除 ===================== */
const savedList = ref<Handout[]>([])
const savedId = ref<number | null>(null)

const loadSavedList = async () => {
  const res = await getHandouts({ page: 1, pageSize: 100 })
  savedList.value = res.list
}

const save = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('请先填写讲义标题')
    return
  }
  if (!items.value.length) {
    ElMessage.warning('请先添加讲义内容')
    return
  }
  saving.value = true
  try {
    const payload = { title: title.value.trim(), items: items.value, status: 'published' as const }
    if (editingId.value) {
      await updateHandout(editingId.value, payload)
      ElMessage.success('讲义已更新')
    } else {
      const created = await createHandout(payload)
      editingId.value = created.id
      ElMessage.success('讲义已保存')
    }
    savedId.value = editingId.value
    syncUrl(editingId.value)
    await loadSavedList()
  } finally {
    saving.value = false
  }
}

// 地址栏始终反映当前编辑的讲义，刷新/转发都能回到同一份
const syncUrl = (id: number | null) => {
  if ((Number(route.query.id) || null) === id) return
  router.replace({ path: '/handouts', query: id ? { id: String(id) } : {} })
}

// 加载已保存讲义：items 由后端解析为完整内容（被删除的题目/结论/分类已自动剔除）
const loadHandout = async (id: number) => {
  const [detail, res] = await Promise.all([getHandout(id), getHandoutItems(id)])
  editingId.value = detail.id
  title.value = detail.title
  items.value = res.items
  questionMap.clear()
  conclusionMap.clear()
  knowledgeMap.clear()
  res.questions.forEach((q) => questionMap.set(q.id, q))
  res.conclusions.forEach((c) => conclusionMap.set(c.id, c))
  res.knowledges.forEach((k) => knowledgeMap.set(k.id, k))
  savedId.value = detail.id
  syncUrl(detail.id)
}

const onPickSaved = async (id: number | '') => {
  if (!id) {
    if (editingId.value) resetBuilder()
    return
  }
  await loadHandout(Number(id))
}

const resetBuilder = () => {
  editingId.value = null
  title.value = ''
  items.value = []
  questionMap.clear()
  conclusionMap.clear()
  knowledgeMap.clear()
  savedId.value = null
  syncUrl(null)
}

const removeSaved = async () => {
  if (!editingId.value) return
  try {
    await ElMessageBox.confirm(`确定删除讲义「${title.value}」？此操作不可恢复。`, '删除讲义确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await deleteHandout(editingId.value)
  ElMessage.success('删除成功')
  resetBuilder()
  await loadSavedList()
}

onMounted(async () => {
  await Promise.all([loadSavedList(), loadCategories(), loadQuestionPool(), loadConclusionPool()])
  tagOptions.value = await getQuestionTags().catch(() => [])
  // 从讲义列表点「打开编辑」进来时带 ?id=，直接载入该讲义
  const qid = Number(route.query.id)
  if (Number.isInteger(qid) && qid > 0) {
    try {
      await loadHandout(qid)
    } catch {
      resetBuilder() // 讲义已被删除或不存在
    }
  }
})
</script>

<style scoped>
.handout {
  display: flex;
  flex-direction: column;
  /* 顶栏(68) + 上边距(14) + 主区上下内边距(54) ≈ 136，留 6px 缓冲 */
  height: calc(100vh - 142px);
  min-height: 540px;
}

/* —— 顶栏 —— */
.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.topbar-side {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.topbar-side--right {
  margin-left: auto;
}
.saved-select {
  width: 220px;
}
.saved-option {
  display: inline-block;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
.saved-option__date {
  float: right;
  font-size: 12px;
  color: var(--ink-soft);
}
.title-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.72);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.title-input:focus {
  border-color: var(--moss);
  box-shadow: 0 0 0 3px rgba(150, 104, 26, 0.16);
}
.title-input::placeholder {
  color: var(--ink-soft);
  font-weight: 400;
}
.save-state {
  font-size: 12px;
  color: var(--moss-deep);
}

/* —— 左右分栏 —— */
.split {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 14px;
}

/* 左栏 */
.left {
  flex-shrink: 0;
  width: 460px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
/* 已选内容概览条：只显示数量并提供打开弹窗的入口，不再占用列表空间 */
.picked-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 12px;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  color: var(--ink-regular);
}
.picked-bar__stat b {
  font-size: 14px;
  color: var(--ink);
}
.picked-bar__stat em {
  margin-left: 8px;
  font-style: normal;
  font-size: 12px;
  color: var(--ink-soft);
}
.pool {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.55);
  padding: 4px 12px 8px;
}
.pool-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* 压缩 tab 头与筛选项的垂直占用，把空间让给列表 */
.pool-tabs :deep(.el-tabs__header) {
  margin-bottom: 6px;
}
.pool-tabs :deep(.el-tabs__item) {
  height: 34px;
  line-height: 34px;
  font-size: 13px;
}
.pool-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pool-tabs :deep(.el-tab-pane) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.pool-filters {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.pool-filters .el-input {
  flex: 1;
}
.pool-filters .el-select {
  width: 118px;
}
.pool-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.pool-row {
  padding: 7px 10px;
  margin-bottom: 5px;
  border: 1px solid var(--edge);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.pool-row:hover {
  border-color: rgba(150, 104, 26, 0.5);
}
.pool-row.is-picked {
  border-color: var(--moss);
  background: var(--moss-soft);
}
.pool-row__title {
  font-size: 13px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pool-row__title :deep(img) {
  max-height: 90px;
  max-width: 100%;
  object-fit: contain;
}
.pool-row__title :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}
.pool-row__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kp-tree-mark {
  color: var(--ink-soft);
  margin-right: 4px;
  font-weight: 400;
}
/* 知识点行：名称后跟结论条数，便于判断该分类是否有内容可插 */
.kp-count {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-soft);
}
/* 空分类：整行弱化，点击会被拦截并给出提示 */
.pool-row--kp.is-empty {
  opacity: 0.55;
  cursor: not-allowed;
}
.pool-row__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-soft);
}
.pool-row__meta .kp {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pool-row__action {
  flex-shrink: 0;
  color: var(--moss-deep);
  font-weight: 600;
}
.pool-row--kp {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.kp-hint {
  flex-shrink: 0;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.5;
}
.pool-pager {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

/* 右栏预览 */
.right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.options-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 8px 14px;
  margin-bottom: 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  color: var(--ink-regular);
}
.opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.opt-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.opt-school {
  width: 170px;
}
.preview-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--paper-deep, #eef0f0);
  border-radius: var(--radius-sm);
  padding: 14px;
}
.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.paper {
  box-shadow: 0 2px 14px rgba(24, 30, 36, 0.14);
  border-radius: 2px;
  min-height: 200px;
  background: #fff;
  /* 宽度由 layout.contentWidth 控制（见模板 :style） */
  margin: 0 auto;
}
.paper :deep(img) {
  max-width: 100%;
  object-fit: contain;
}
.paper :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}

/* 矮屏（如 1080×490 的小窗口）：放弃固定高度，改为整页滚动，
   并给选材区兜底高度，避免列表被挤到只剩一行 */
@media (max-height: 820px) {
  .handout {
    height: auto;
    min-height: 0;
  }
  .pool {
    min-height: 360px;
  }
  .preview-scroll {
    max-height: 560px;
  }
}

/* 窄屏：左右改上下堆叠 */
@media (max-width: 1400px) {
  .left {
    width: 400px;
  }
}

@media (max-width: 1080px) {
  .handout {
    height: auto;
  }
  .split {
    flex-direction: column;
  }
  .left {
    width: 100%;
  }
  .pool {
    max-height: 420px;
  }
}
</style>
