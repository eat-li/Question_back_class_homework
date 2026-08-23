<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" @click="openCreate">发布作业</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="title" label="作业标题" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="题目数" width="90">
        <template #default="{ row }">{{ (row.questionIds || []).length }}</template>
      </el-table-column>
      <el-table-column label="截止时间" width="180">
        <template #default="{ row }">
          <span :class="{ 'end-at--expired': isExpired(row.endAt) }">{{ formatDateTime(row.endAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button size="small" @click="openScore(row)">打分</el-button>
          <el-button size="small" type="primary" @click="openExport(row)">导出 PDF</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <!-- 发布作业 -->
  <el-dialog v-model="createVisible" title="发布作业" width="560px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
      <el-form-item label="选择题目">
        <div class="question-picker">
          <el-radio-group v-model="pickMode" size="small" @change="onModeChange">
            <el-radio-button value="multi">多选</el-radio-button>
            <el-radio-button value="single">单选</el-radio-button>
          </el-radio-group>
          <el-button size="small" type="primary" @click="openPicker">抽题</el-button>
          <span class="picked-count">已选 {{ (form.questionIds || []).length }} 题</span>
        </div>
      </el-form-item>
      <el-form-item label="选择学生">
        <div class="question-picker">
          <el-button size="small" type="primary" @click="openStudentPicker">选择学生</el-button>
          <span class="picked-count">已选 {{ (form.studentIds || []).length }} 名学生</span>
        </div>
      </el-form-item>
      <el-form-item label="截止时间">
        <el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createVisible = false">取消</el-button>
      <el-button type="primary" @click="save">发布</el-button>
    </template>
  </el-dialog>

  <!-- 抽题框 -->
  <el-drawer v-model="drawerVisible" title="抽题" size="72%">
    <div class="picker-toolbar">
      <el-input
        v-model="qKeyword"
        placeholder="按题干搜索"
        clearable
        style="width: 220px"
        @keyup.enter="loadQuestions"
      />
      <el-select v-model="qType" placeholder="题型" clearable style="width: 130px" @change="loadQuestions">
        <el-option label="选择题" value="choice" />
        <el-option label="填空题" value="fill" />
        <el-option label="解答题" value="solve" />
      </el-select>
      <el-button type="primary" @click="loadQuestions">查询</el-button>
      <span class="picked-count">已选 {{ pickedIds.length }} 题</span>
    </div>

    <el-table :data="questions" border stripe v-loading="qLoading" @row-click="onRowClick">
      <el-table-column label="选择" width="60">
        <template #default="{ row }">
          <el-checkbox
            v-if="pickMode === 'multi'"
            :model-value="isPicked(row.id)"
            @change="(v: boolean) => togglePick(row.id, v)"
          />
          <el-radio
            v-else
            :model-value="pickedIds[0]"
            :value="row.id"
            @change="() => pickSingle(row.id)"
          />
        </template>
      </el-table-column>
      <el-table-column label="题干" show-overflow-tooltip min-width="220">
        <template #default="{ row }">{{ stripHtml(row.title) }}</template>
      </el-table-column>
      <el-table-column label="题型" width="90">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column prop="knowledgeTag" label="知识点" width="130" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click.stop="showDetail(row)">查看详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmPick">确定</el-button>
    </template>
  </el-drawer>

  <!-- 选择学生 -->
  <el-drawer v-model="studentDrawerVisible" title="选择学生" size="60%">
    <div class="picker-toolbar">
      <el-input
        v-model="sKeyword"
        placeholder="按姓名搜索"
        clearable
        style="width: 220px"
        @keyup.enter="loadStudents"
      />
      <el-button type="primary" @click="loadStudents">查询</el-button>
      <span class="picked-count">已选 {{ pickedStudentIds.length }} 名学生</span>
    </div>

    <el-table :data="students" border stripe v-loading="sLoading" @row-click="onStudentRowClick">
      <el-table-column label="选择" width="60">
        <template #default="{ row }">
          <el-checkbox
            :model-value="isStudentPicked(row.id)"
            @change="(v: boolean) => toggleStudentPick(row.id, v)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="grade" label="年级" />
    </el-table>

    <template #footer>
      <el-button @click="studentDrawerVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmStudentPick">确定</el-button>
    </template>
  </el-drawer>

  <!-- 题目详情 -->
  <el-dialog v-model="qDetailVisible" title="题目详情" width="640px">
    <template v-if="currentQuestion">
      <div class="q-title"><RichContent :html="currentQuestion.title" /></div>
      <el-descriptions :column="3" border class="q-meta">
        <el-descriptions-item label="题型">{{ typeLabel(currentQuestion.type) }}</el-descriptions-item>
        <el-descriptions-item label="难度">{{ currentQuestion.difficulty }}</el-descriptions-item>
        <el-descriptions-item label="知识点">{{ currentQuestion.knowledgeTag || '—' }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="currentQuestion.options" class="q-section">
        <div class="q-label">选项</div>
        <template v-if="Array.isArray(currentQuestion.options)">
          <div v-for="(opt, i) in currentQuestion.options" :key="i" class="q-option">
            {{ String.fromCharCode(65 + i) }}. {{ typeof opt === 'string' ? opt : JSON.stringify(opt) }}
          </div>
        </template>
        <div v-else>{{ JSON.stringify(currentQuestion.options) }}</div>
      </div>
      <div v-if="currentQuestion.body" class="q-section">
        <div class="q-label">补充说明</div>
        <RichContent :html="currentQuestion.body" />
      </div>
      <div v-if="currentQuestion.answer" class="q-section">
        <div class="q-label">答案</div>
        <div class="q-text">{{ currentQuestion.answer }}</div>
      </div>
      <div v-if="currentQuestion.analysis" class="q-section">
        <div class="q-label">解析</div>
        <div class="q-text">{{ currentQuestion.analysis }}</div>
      </div>
    </template>
    <template #footer>
      <el-button type="primary" @click="qDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 导出作业 PDF -->
  <el-dialog v-model="exportVisible" title="导出作业 PDF" width="1000px" top="4vh">
    <div class="export-layout">
      <div class="export-options">
        <el-form label-width="90px" size="small">
          <el-form-item label="显示答案"><el-switch v-model="layout.showAnswer" /></el-form-item>
          <el-form-item label="字号">
            <el-radio-group v-model="layout.fontSize">
              <el-radio-button value="14">小</el-radio-button>
              <el-radio-button value="16">中</el-radio-button>
              <el-radio-button value="18">大</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="行距">
            <el-radio-group v-model="layout.lineHeight">
              <el-radio-button value="1.6">紧凑</el-radio-button>
              <el-radio-button value="1.8">正常</el-radio-button>
              <el-radio-button value="2.2">宽松</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="答题留白"><el-switch v-model="layout.showAnswerArea" /></el-form-item>
          <el-form-item v-if="layout.showAnswerArea" label="留白高度">
            <el-slider v-model="layout.answerAreaHeight" :min="20" :max="160" :step="10" />
          </el-form-item>
          <el-form-item label="显示分值"><el-switch v-model="layout.showScore" /></el-form-item>
          <el-form-item v-if="layout.showScore" label="每题分值">
            <el-input-number v-model="layout.scorePerQuestion" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="学校名称"><el-input v-model="layout.schoolName" placeholder="页眉显示" /></el-form-item>
          <el-form-item label="姓名/年级/分数栏"><el-switch v-model="layout.showNameLine" /></el-form-item>
          <el-form-item label="显示题型"><el-switch v-model="layout.showType" /></el-form-item>
          <el-form-item label="显示知识点"><el-switch v-model="layout.showKnowledge" /></el-form-item>
        </el-form>
      </div>
      <div class="export-preview">
        <div ref="previewRef" class="paper" v-html="previewHtml"></div>
      </div>
    </div>
    <template #footer>
      <div class="export-footer">
        <span class="export-tip">提示：弹出打印窗口后，请在打印对话框的「更多设置」中取消勾选「页眉和页脚」，即可去掉左下角的 about:blank 与左上角的日期时间。</span>
        <span class="export-actions">
          <el-button @click="exportVisible = false">取消</el-button>
          <el-button type="primary" @click="doExport">导出 PDF</el-button>
        </span>
      </div>
    </template>
  </el-dialog>

  <!-- 录入成绩 -->
  <el-dialog v-model="scoreVisible" title="录入成绩" width="560px">
    <el-table :data="scoreRows" border max-height="480">
      <el-table-column prop="name" label="学生" width="120" />
      <el-table-column prop="grade" label="年级" width="100" />
      <el-table-column label="得分">
        <template #default="{ row }">
          <el-input-number v-model="row.score" :min="0" :precision="1" size="small" />
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="scoreVisible = false">取消</el-button>
      <el-button type="primary" @click="saveScores">保存成绩</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getHomeworks,
  getHomework,
  getHomeworkQuestions,
  createHomework,
  deleteHomework,
  saveHomeworkScores
} from '../../api/homework'
import { getQuestions } from '../../api/question'
import { getStudents } from '../../api/student'
import renderMathInElement from 'katex/contrib/auto-render'
import katexCss from 'katex/dist/katex.min.css?raw'
import RichContent from '../../components/RichContent.vue'

const list = ref([])
const questions = ref([])
const loading = ref(false)
const createVisible = ref(false)
const scoreVisible = ref(false)
const scoreRows = ref<any[]>([])
const scoreHomeworkId = ref<number | null>(null)
const form = reactive<any>({ questionIds: [], status: 'published' })

// —— 抽题框状态 ——
const drawerVisible = ref(false)
const qDetailVisible = ref(false)
const currentQuestion = ref<any>(null)
const pickMode = ref('multi') // multi | single
const pickedIds = ref<number[]>([])
const qKeyword = ref('')
const qType = ref('')
const qLoading = ref(false)

// —— 选择学生状态 ——
const studentDrawerVisible = ref(false)
const students = ref<any[]>([])
const pickedStudentIds = ref<number[]>([])
const sKeyword = ref('')
const sLoading = ref(false)

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}
const typeLabel = (t: string) => typeMap[t] || t

// —— 状态与截止时间的展示辅助 ——
const statusMap: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'info' | 'primary' | 'danger' }
> = {
  draft: { label: '草稿', type: 'info' },
  published: { label: '已发布', type: 'success' },
  closed: { label: '已截止', type: 'warning' }
}
const statusLabel = (s: string) => statusMap[s]?.label || s || '—'
const statusTagType = (s: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' =>
  statusMap[s]?.type || 'info'

// 日期时间格式化：DATE / ISO / 字符串 → YYYY-MM-DD HH:mm
const formatDateTime = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 截止时间是否已过（用于标红提示）
const isExpired = (d: any) => {
  if (!d) return false
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

// 富文本 HTML 转纯文本，用于列表显示
const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

const load = async () => {
  loading.value = true
  try {
    list.value = await getHomeworks()
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  Object.keys(form).forEach((k) => delete form[k])
  form.questionIds = []
  form.studentIds = []
  form.status = 'published'
  pickMode.value = 'multi'
  pickedIds.value = []
  qKeyword.value = ''
  qType.value = ''
  createVisible.value = true
}

// 加载题目列表（抽题框内搜索/筛选）
const loadQuestions = async () => {
  qLoading.value = true
  try {
    questions.value = await getQuestions({ keyword: qKeyword.value, type: qType.value })
  } finally {
    qLoading.value = false
  }
}

// 打开抽题框
const openPicker = async () => {
  pickedIds.value = [...(form.questionIds || [])]
  await loadQuestions()
  drawerVisible.value = true
}

// 切换单选/多选时清空已选
const onModeChange = () => {
  pickedIds.value = []
}

const isPicked = (id: number) => pickedIds.value.includes(id)

const togglePick = (id: number, checked: boolean) => {
  if (checked) {
    if (!pickedIds.value.includes(id)) pickedIds.value.push(id)
  } else {
    pickedIds.value = pickedIds.value.filter((x) => x !== id)
  }
}

const pickSingle = (id: number) => {
  pickedIds.value = [id]
}

// 单选模式点击整行即选中
const onRowClick = (row: any) => {
  if (pickMode.value === 'single') pickSingle(row.id)
}

// 确认抽题
const confirmPick = () => {
  if (pickMode.value === 'single' && !pickedIds.value.length) {
    ElMessage.warning('请选择一道题目')
    return
  }
  form.questionIds = [...pickedIds.value]
  drawerVisible.value = false
}

// 加载学生列表（选择学生抽屉内）
const loadStudents = async () => {
  sLoading.value = true
  try {
    students.value = await getStudents({ keyword: sKeyword.value })
  } finally {
    sLoading.value = false
  }
}

// 打开选择学生抽屉
const openStudentPicker = async () => {
  pickedStudentIds.value = [...(form.studentIds || [])]
  await loadStudents()
  studentDrawerVisible.value = true
}

const isStudentPicked = (id: number) => pickedStudentIds.value.includes(id)

const toggleStudentPick = (id: number, checked: boolean) => {
  if (checked) {
    if (!pickedStudentIds.value.includes(id)) pickedStudentIds.value.push(id)
  } else {
    pickedStudentIds.value = pickedStudentIds.value.filter((x) => x !== id)
  }
}

const onStudentRowClick = (row: any) => {
  toggleStudentPick(row.id, !isStudentPicked(row.id))
}

const confirmStudentPick = () => {
  form.studentIds = [...pickedStudentIds.value]
  studentDrawerVisible.value = false
}

// 查看题目详情
const showDetail = (row: any) => {
  currentQuestion.value = row
  qDetailVisible.value = true
}

// —— 导出 PDF 状态与排版选项 ——
const exportVisible = ref(false)
const exportLoading = ref(false)
const exportHomework = ref<any>(null)
const exportQuestions = ref<any[]>([])
const exportStudents = ref<any[]>([])

const layout = reactive({
  showAnswer: false,
  fontSize: '16', // px
  lineHeight: '1.8',
  showAnswerArea: true,
  answerAreaHeight: 60, // px
  showScore: true,
  scorePerQuestion: 5,
  schoolName: '',
  showNameLine: true,
  showType: true,
  showKnowledge: false
})

// HTML 转义，避免题目内容被解析为标签
const escapeHtml = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[c]
  })

// 生成「姓名/年级/分数」填写框（有值则预填，无值留空方框）
const fillLine = (val?: string) =>
  `<span style="display:inline-block;min-width:80px;height:1.6em;line-height:1.6em;border:1px solid #666;border-radius:2px;padding:0 6px;vertical-align:middle;">${escapeHtml(val ?? '') || '&nbsp;'}</span>`

// 根据排版选项生成作业纸 HTML（预览与导出共用，保证所见即所得）
const buildHomeworkHtml = () => {
  const fs = Number(layout.fontSize)
  const lh = layout.lineHeight
  const title = exportHomework.value?.title || '数学作业'
  const questions = exportQuestions.value
  const total = questions.reduce(
    (s: number) => s + (layout.showScore ? layout.scorePerQuestion : 0),
    0
  )

  const renderHeader = (st?: any) => `
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      ${layout.schoolName ? `<div style="font-size:${fs + 2}px;font-weight:600;letter-spacing:3px;">${escapeHtml(layout.schoolName)}</div>` : ''}
      <div style="font-size:${fs + 6}px;font-weight:700;margin:6px 0;">${escapeHtml(title)}</div>
      <div style="font-size:${fs - 2}px;color:#555;display:flex;justify-content:space-between;align-items:center;padding:0 6px;">
        ${layout.showNameLine ? `<span>姓名：${fillLine(st?.name)}　年级：${fillLine(st?.grade)}　分数：${fillLine('')}</span>` : '<span></span>'}
        ${layout.showScore ? `<span>总分：${total} 分</span>` : ''}
      </div>
    </div>`

  const renderBody = () =>
    questions
      .map((q, i) => {
        const no = i + 1
        const opts =
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
        return `
      <div style="margin-bottom:16px;page-break-inside:avoid;">
        <div style="margin-bottom:4px;">
          <span style="font-weight:700;">${no}.</span>
          ${layout.showType ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">【${escapeHtml(typeLabel(q.type))}】</span>` : ''}
          ${layout.showKnowledge && q.knowledgeTag ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">${escapeHtml(q.knowledgeTag)}</span>` : ''}
          ${layout.showScore ? `<span style="float:right;color:#666;">（${layout.scorePerQuestion} 分）</span>` : ''}
        </div>
        <div>${q.title || ''}</div>
        ${opts}
        ${q.body ? `<div style="margin-top:4px;">${q.body}</div>` : ''}
        ${layout.showAnswerArea ? `<div style="height:${layout.answerAreaHeight}px;"></div>` : ''}
        ${layout.showAnswer && q.answer ? `<div style="color:#c0392b;margin-top:4px;"><b>【答案与解析】</b>${q.answer}</div>` : ''}
      </div>`
      })
      .join('')

  // 作业选中了学生：按学生每人一份（分页）；否则生成一份空模板
  const students = exportStudents.value.length ? exportStudents.value : [null]
  const paperStyle = `font-family:'宋体','SimSun','Microsoft YaHei',serif;font-size:${fs}px;line-height:${lh};color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;`

  return students
    .map(
      (st, idx) =>
        `<div style="${paperStyle}${idx < students.length - 1 ? 'page-break-after:always;' : ''}">${renderHeader(st)}${renderBody()}</div>`
    )
    .join('')
}

// 预览 HTML（响应式，选项变化即刷新）
const previewHtml = computed(() => buildHomeworkHtml())

const previewRef = ref<HTMLElement>()

// 对预览 DOM 渲染 $...$ 公式
const renderPreviewMath = () => {
  if (previewRef.value) {
    renderMathInElement(previewRef.value, {
      delimiters: [{ left: '$', right: '$', display: false }],
      throwOnError: false
    })
  }
}

// 预览内容变化后重新渲染公式
watch(previewHtml, async () => {
  await nextTick()
  renderPreviewMath()
}, { immediate: true })

// 把 HTML 中的 $...$ 公式渲染成 KaTeX HTML（导出用）
const renderMathHtml = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html
  renderMathInElement(div, {
    delimiters: [{ left: '$', right: '$', display: false }],
    throwOnError: false
  })
  return div.innerHTML
}

// 打开导出预览
const openExport = async (row: any) => {
  exportHomework.value = row
  exportQuestions.value = []
  exportStudents.value = []
  exportVisible.value = true
  exportLoading.value = true
  try {
    exportQuestions.value = await getHomeworkQuestions(row.id)
    // 作业选中的学生，导出时预填姓名/年级
    const ids: number[] = row.studentIds || []
    if (ids.length) {
      const students = await getStudents()
      exportStudents.value = students.filter((s: any) => ids.includes(s.id))
    }
  } finally {
    exportLoading.value = false
  }
}

// 导出：写入独立打印窗口，触发浏览器“另存为 PDF”
const doExport = () => {
  if (!exportQuestions.value.length) {
    ElMessage.warning('该作业没有题目')
    return
  }
  const rendered = renderMathHtml(buildHomeworkHtml())
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
    return
  }
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
      exportHomework.value?.title || '作业'
    )}</title><style>${katexCss}</style></head><body>${rendered}</body></html>`
  )
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

const save = async () => {
  if (!(form.studentIds || []).length) {
    ElMessage.warning('请先选择学生')
    return
  }
  await createHomework(form)
  ElMessage.success('发布成功')
  createVisible.value = false
  load()
}

const openScore = async (row: any) => {
  const [students, detail] = await Promise.all([getStudents(), getHomework(row.id)])
  const studentIds: number[] = detail.studentIds || []
  if (!studentIds.length) {
    ElMessage.warning('该作业还没有选择学生，请重新发布并选择学生')
    return
  }
  const scoreMap = new Map((detail.submissions || []).map((s: any) => [s.studentId, s.score]))
  scoreRows.value = students
    .filter((st: any) => studentIds.includes(st.id))
    .map((st: any) => ({
      id: st.id,
      name: st.name,
      grade: st.grade || '—',
      score: scoreMap.get(st.id) ?? 0
    }))
  scoreHomeworkId.value = row.id
  scoreVisible.value = true
}

const saveScores = async () => {
  const scores = scoreRows.value.map((r) => ({ studentId: r.id, score: Number(r.score) || 0 }))
  await saveHomeworkScores(scoreHomeworkId.value!, scores)
  ElMessage.success('成绩已保存')
  scoreVisible.value = false
}

const remove = async (row: any) => {
  await ElMessageBox.confirm('确定删除该作业？', '提示', { type: 'warning' })
  await deleteHomework(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.question-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.picked-count {
  color: #909399;
  font-size: 13px;
}
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.q-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.5;
}
.q-meta {
  margin-bottom: 12px;
}
.q-section {
  margin-bottom: 12px;
}
.q-label {
  font-weight: 600;
  color: #606266;
  margin-bottom: 4px;
}
.q-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #303133;
}
.q-option {
  line-height: 1.8;
  color: #303133;
}
.export-layout {
  display: flex;
  gap: 16px;
  height: 66vh;
}
.export-options {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid #ebeef5;
  padding-right: 12px;
}
.export-preview {
  flex: 1;
  overflow: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
}
.paper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  min-height: 100%;
}
.export-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
}
.export-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.export-actions {
  flex-shrink: 0;
}
.end-at--expired {
  color: #f56c6c;
  font-weight: 600;
}
</style>
