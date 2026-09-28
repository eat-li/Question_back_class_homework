<template>
  <el-card>
    <!-- 第一行：返回 + 题库名 + 题量 -->
    <div class="toolbar">
      <el-button link type="primary" :icon="ArrowLeft" @click="goBack">返回题库</el-button>
      <span class="title">{{ tagLabel }}</span>
      <el-tooltip v-if="tag !== '__empty__'" content="重命名题库" placement="top" :show-after="400">
        <el-icon class="toolbar-rename" @click="renameCurrentTag"><EditPen /></el-icon>
      </el-tooltip>
      <span class="count">共 {{ total }} 题</span>
    </div>

    <!-- 第二行：只有筛选；导出选项收进导出对话框，不再和筛选挤一行 -->
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
        <el-button type="primary" :icon="Download" @click="exportVisible = true"
          >导出 PDF</el-button
        >
      </div>
    </div>

    <div class="klayout">
      <!-- 左栏：二级知识点列表。名称左对齐、题量右对齐；可点击筛选、拖放归类 -->
      <aside class="kside" :class="{ dragging: dragId !== null }">
        <div class="kside__head">
          <span>二级知识点</span>
          <span v-if="dragId !== null" class="kside__tip">松手即归入</span>
          <span v-else-if="subTag" class="kside__tip is-link" @click="selectSubTag('')">
            清除筛选
          </span>
        </div>

        <ul class="ksubs">
          <li class="ksubs__item" :class="{ 'is-active': subTag === '' }" @click="selectSubTag('')">
            <i class="ksubs__lv is-placeholder" />
            <span class="ksubs__name">全部</span>
            <span class="ksubs__count">{{ allCount }}</span>
          </li>
          <li
            v-for="s in subTags"
            :key="s.name"
            class="ksubs__item"
            :class="{ 'is-active': subTag === s.name }"
            :title="`筛选「${s.name}」`"
            @click="selectSubTag(s.name)"
            @dragover.prevent
            @drop.prevent="onDropTo(s.name)"
          >
            <!-- 掌握等级：圆点颜色即等级，点圆点可直接改 -->
            <el-dropdown
              class="ksubs__lvdrop"
              trigger="click"
              placement="bottom-start"
              @click.stop
              @command="(lv: string) => onSetLevel(s, lv)"
            >
              <i
                class="ksubs__lv"
                :class="s.level ? `is-${s.level}` : 'is-none'"
                :style="levelDotStyle(s.level)"
                :title="`掌握等级：${levelLabel(s.level)}（点击选择 基础 / 中等 / 进阶）`"
              />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="lv in KNOWLEDGE_LEVELS"
                    :key="lv.value"
                    :command="lv.value"
                  >
                    <i class="lvdot" :style="{ background: lv.color }" />{{ lv.label }}
                  </el-dropdown-item>
                  <el-dropdown-item divided command="__clear__">取消等级</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <span class="ksubs__name">{{ s.name }}</span>
            <span
              class="ksubs__count"
              :style="s.level ? { color: levelColor(s.level) } : undefined"
              >{{ s.total }}</span
            >
            <span
              class="ksubs__edit"
              title="编辑该二级知识点（重命名 / 合并 / 删除）"
              @click.stop="openSubEdit(s)"
            >
              <EditPen />
            </span>
          </li>
          <li
            class="ksubs__item is-dashed"
            :class="{ 'is-active': subTag === '__empty__' }"
            title="筛选未归类的题目"
            @click="selectSubTag('__empty__')"
            @dragover.prevent
            @drop.prevent="onDropTo(null)"
          >
            <i class="ksubs__lv is-placeholder" />
            <span class="ksubs__name">未分类</span>
            <span class="ksubs__count">{{ emptyCount }}</span>
          </li>
        </ul>

        <p v-if="!subTags.length" class="kside__hint">
          还没有二级知识点——在题目卡片右上角的下拉框里直接输入名称即可新建。
        </p>
        <!-- 等级图例：一眼看懂圆点颜色 -->
        <div v-if="subTags.length" class="kside__legend">
          <span v-for="lv in KNOWLEDGE_LEVELS" :key="lv.value" class="kside__legend-item">
            <i class="lvdot" :style="{ background: lv.color }" />{{ lv.label }}
          </span>
        </div>
      </aside>

      <!-- 右栏：题目卡片列表，题干完整、选项齐全 -->
      <div v-loading="loading" class="kmain">
        <el-empty v-if="!loading && !list.length" description="这里还没有题目" />

        <div class="klist">
          <QuestionCard
            v-for="(q, idx) in list"
            :key="q.id"
            :question="q"
            :no="(page - 1) * pageSize + idx + 1"
            :show-tags="false"
            @generated="(html: string) => (q.answer = html)"
          >
            <template #handle>
              <span
                class="drag-handle"
                draggable="true"
                :title="subTags.length ? '按住拖拽到左侧二级知识点上归类' : '用右侧下拉框归类'"
                @dragstart="onDragStart($event, q)"
                @dragend="onDragEnd"
              >
                <Rank />
              </span>
            </template>
            <template #tools>
              <el-select
                class="sub-pick"
                :model-value="q.knowledgeSubTag || ''"
                size="small"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="未分类"
                @change="(v: any) => onSubTagEdit(q, v)"
              >
                <el-option v-for="s in subTags" :key="s.name" :label="s.name" :value="s.name" />
              </el-select>
              <el-button size="small" :icon="Edit" @click="openEdit(q)">编辑</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click="remove(q)"
                >删除</el-button
              >
            </template>
          </QuestionCard>
        </div>

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
      </div>
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

  <QuestionExportDialog v-model="exportVisible" :scope="exportScope" :scope-label="exportLabel" />
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ArrowLeft, Download, Edit, Delete, Rank, EditPen } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getQuestions,
  getQuestionSubTags,
  setQuestionSubLevel,
  updateQuestion,
  deleteQuestion,
  renameQuestionTag
} from '../../api/question'
import type { QuestionQuery } from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'
import SubTagEditDialog from '../../components/SubTagEditDialog.vue'
import QuestionCard from '../../components/QuestionCard.vue'
import QuestionExportDialog from '../../components/QuestionExportDialog.vue'
import type { Question } from '../../types'
import {
  KNOWLEDGE_LEVELS,
  knowledgeLevelLabel,
  knowledgeLevelMeta
} from '../../utils/knowledgeLevel'
import type { KnowledgeLevel } from '../../utils/knowledgeLevel'

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

// —— 二级知识点筛选 ——
const subTag = ref('')
const subTags = ref<{ name: string; total: number; level?: KnowledgeLevel | null }[]>([])
// 未归类题量：subtags 接口只返回有值的二级，未分类要单独取一次
const emptyCount = ref(0)
// 「全部」= 各二级之和 + 未分类，正好覆盖该一级知识点下的所有题
const allCount = computed(() => subTags.value.reduce((n, s) => n + s.total, 0) + emptyCount.value)

// —— 导出 PDF（当前一级 + 当前二级筛选）——
const exportVisible = ref(false)
const exportScope = computed(() => {
  const p: QuestionQuery = { knowledgeTag: tag.value }
  if (subTag.value === '__empty__') p.knowledgeSubTag = '__empty__'
  else if (subTag.value) p.knowledgeSubTag = subTag.value
  return p
})
const exportLabel = computed(() => {
  if (!subTag.value) return tagLabel.value
  return `${tagLabel.value} › ${subTag.value === '__empty__' ? '未分类' : subTag.value}`
})

// —— 二级知识点编辑（重命名 / 合并 / 删除 / 换题库）——
const subEditVisible = ref(false)
const subEditTarget = ref<{ name: string; total: number }>({ name: '', total: 0 })

const openSubEdit = (s: { name: string; total: number }) => {
  subEditTarget.value = { name: s.name, total: s.total }
  subEditVisible.value = true
}

// 编辑完成后刷新列表与二级候选；若当前正在筛选的二级被改名/删除，跟随切换到新名称

// —— 二级知识点掌握等级（基础 / 中等 / 进阶）——
// 圆点颜色即等级，点圆点即可直接修改；没定级的显示空心圆点
const levelLabel = (lv?: string | null) => knowledgeLevelLabel(lv)
const levelColor = (lv?: string | null) => knowledgeLevelMeta(lv)?.color || 'transparent'
const levelDotStyle = (lv?: string | null) => {
  const meta = knowledgeLevelMeta(lv)
  return meta ? { background: meta.color, boxShadow: `0 0 0 3px ${meta.soft}` } : undefined
}

// 设置 / 取消等级：先本地变色（即时反馈），失败再回滚，避免整表刷新
const onSetLevel = async (item: { name: string; level?: KnowledgeLevel | null }, level: string) => {
  const next = level === '__clear__' ? null : (level as KnowledgeLevel)
  if ((item.level || null) === next) return
  const prev = item.level || null
  item.level = next
  try {
    await setQuestionSubLevel({ knowledgeTag: tag.value, name: item.name, level: next })
    ElMessage.success(
      next
        ? `已将「${item.name}」标记为${knowledgeLevelLabel(next)}`
        : `已取消「${item.name}」的等级`
    )
  } catch {
    item.level = prev // 失败回滚；错误提示由 request.ts 统一弹出
  }
}

const onSubTagSaved = async (payload?: { name?: string }) => {
  const oldName = subEditTarget.value.name
  await Promise.all([loadSubTags(), load()])
  if (oldName && subTag.value === oldName) {
    const next = payload?.name
    subTag.value = next && subTags.value.some((s) => s.name === next) ? next : ''
    await load()
  }
}

// 加载当前一级知识点下的二级知识点（带题量）与未分类题量
const loadSubTags = async () => {
  try {
    subTags.value = await getQuestionSubTags(tag.value)
  } catch {
    subTags.value = []
  }
  try {
    const res = await getQuestions({
      knowledgeTag: tag.value,
      knowledgeSubTag: '__empty__',
      page: 1,
      pageSize: 1
    })
    emptyCount.value = res.total
  } catch {
    emptyCount.value = 0
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

// 导出交给 QuestionExportDialog 统一处理（含答案 / 答题留白 / 按知识点分组都在对话框里选）
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
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.04em;
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
    color var(--dur) var(--ease),
    background-color var(--dur) var(--ease);
}
.toolbar-rename:hover {
  color: var(--moss-deep);
  background: var(--moss-soft);
}

.filters {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.filters__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 14px;
}

/* —— 主体：左栏二级知识点 + 右栏题目卡片 —— */
.klayout {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.kside {
  flex-shrink: 0;
  width: 246px;
  /*
   * 侧栏钉住，不随题目列表上下滚。
   * 前提：祖先里不能有「非 visible 的 overflow」，否则那个祖先会成为最近的滚动容器，
   * sticky 就被钉死在一个从不滚动的盒子上（Element Plus 的 .el-card / .el-card__body
   * 正是这种情况，已在 theme.css 里放开）。top 给一点间距，贴着顶栏不好看。
   */
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  padding: 12px 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-soft);
}
.kside__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--hair);
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--ink-soft);
}
.kside__tip {
  margin-left: auto;
  font-size: 11px;
  letter-spacing: 0;
  color: var(--moss-deep);
}
.kside__tip.is-link {
  cursor: pointer;
}
.kside__tip.is-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.kside__hint {
  margin: 10px 8px 2px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-soft);
}

/* 二级知识点列表：名称左对齐成一列、题量右对齐成一列 */
.ksubs {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ksubs__item {
  display: flex;
  align-items: center;
  /*
   * 这里刻意不用 gap：编辑图标即使宽度为 0，gap 依然占位，
   * 会让「有编辑图标的行」比「没有的」（全部 / 未分类）多出一个间距，题量列就对不齐了。
   * 名称的右间距改用 margin 表达。
   */
  gap: 0;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color var(--dur) var(--ease);
}
.ksubs__item:hover {
  background: rgba(255, 255, 255, 0.62);
}
.ksubs__item.is-active {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(246, 246, 243, 0.7));
  box-shadow: var(--lit-top), var(--lit-deep);
}
.ksubs__name {
  flex: 1;
  min-width: 0;
  margin-right: 8px;
  font-size: 13px;
  color: var(--ink-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ksubs__item.is-active .ksubs__name {
  color: var(--ink);
  font-weight: 600;
}
.ksubs__count {
  flex-shrink: 0;
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--ink-soft);
}
.ksubs__item.is-active .ksubs__count {
  color: var(--moss-deep);
}
/* 「未分类」用一条细线隔开，与真实二级知识点区分 */
.ksubs__item.is-dashed {
  margin-top: 6px;
  border-top: 1px solid var(--hair);
  border-radius: 0 0 8px 8px;
}
/* 编辑入口平时不占宽度，悬停该行才展开 */
.ksubs__edit {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  width: 0;
  overflow: hidden;
  opacity: 0;
  font-size: 12px;
  cursor: pointer;
  transition:
    width var(--dur) var(--ease),
    opacity var(--dur) var(--ease);
}
.ksubs__item:hover .ksubs__edit {
  width: 15px;
  opacity: 0.75;
}
.ksubs__edit:hover {
  opacity: 1;
}
/* 拖拽中：左侧每一项都是可投放目标 */
.kside.dragging .ksubs__item {
  outline: 1px dashed var(--moss);
  outline-offset: -2px;
}
.kside.dragging .ksubs__item:hover {
  background: var(--moss);
  outline-style: solid;
}
.kside.dragging .ksubs__item:hover .ksubs__name,
.kside.dragging .ksubs__item:hover .ksubs__count {
  color: var(--on-accent);
}

.kmain {
  flex: 1;
  min-width: 0;
}
.klist {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

/* 卡片头上的拖拽手柄 */
.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: grab;
  color: var(--ink-soft);
  font-size: 16px;
  padding: 2px 4px;
  border-radius: 6px;
  transition:
    color var(--dur) var(--ease),
    background-color var(--dur) var(--ease);
}
.drag-handle:hover {
  color: var(--moss-deep);
  background: var(--moss-soft);
}
.drag-handle:active {
  cursor: grabbing;
}
.sub-pick {
  width: 152px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

@media (max-width: 1000px) {
  .klayout {
    flex-direction: column;
  }
  .kside {
    width: 100%;
    position: static;
    max-height: none;
  }
  /* 窄屏排成两列，省一半高度 */
  .ksubs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 8px;
  }
}
@media (max-width: 720px) {
  .sub-pick {
    width: 120px;
  }
}
/* —— 二级知识点掌握等级：圆点 + 图例 —— */
.ksubs__lvdrop {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
.ksubs__lv {
  width: 7px;
  height: 7px;
  margin-right: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform var(--dur) var(--ease);
}
.ksubs__lv:hover {
  transform: scale(1.35);
}
.ksubs__lv.is-none {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-strong);
}
.ksubs__lv.is-placeholder {
  visibility: hidden;
  cursor: default;
}
.lvdot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: middle;
}
.kside__legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 8px 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--hair);
  font-size: 11px;
  color: var(--ink-soft);
}
.kside__legend-item {
  display: inline-flex;
  align-items: center;
}
</style>
