<template>
  <el-card>
    <div class="toolbar">
      <el-button link type="primary" :icon="ArrowLeft" @click="goBack">返回题库</el-button>
      <span class="title">{{ tagLabel }}</span>
      <span class="count">共 {{ list.length }} 题</span>
    </div>

    <div class="filters">
      <el-radio-group v-model="type" @change="load">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="choice">选择题</el-radio-button>
        <el-radio-button value="fill">填空题</el-radio-button>
        <el-radio-button value="solve">解答题</el-radio-button>
      </el-radio-group>
      <el-select v-model="difficulty" placeholder="难度" clearable style="width: 120px" @change="load">
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

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="题干" show-overflow-tooltip min-width="240">
        <template #default="{ row }">{{ stripHtml(row.title) }}</template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="80" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <QuestionFormDialog v-model="editVisible" :question="editing" @saved="load" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Download, Edit, Delete } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getQuestions, deleteQuestion } from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'
import renderMathInElement from 'katex/contrib/auto-render'
import katexCss from 'katex/dist/katex.min.css?raw'

const route = useRoute()
const router = useRouter()

// 知识点标识：路由参数；__empty__ 表示「未分类」
const tag = computed(() => String(route.params.tag || ''))
const tagLabel = computed(() => (tag.value === '__empty__' ? '未分类' : tag.value))

const list = ref<any[]>([])
const loading = ref(false)
const type = ref('all')
const difficulty = ref<number>()
const editVisible = ref(false)
const editing = ref<any>(null)
const showAnswer = ref(false)
const showAnswerArea = ref(false)
const answerAreaHeight = ref(100)

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}
const typeLabel = (t: string) => typeMap[t] || t

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

// HTML 转义（选项等纯文本字段）
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

// 生成知识点题目集 HTML（打印用）
const buildQuestionsHtml = (questions: any[], withAnswer: boolean) => {
  const fs = 16
  const title = `${tagLabel.value} · 题目集`
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
  return `<div style="font-family:'宋体','SimSun','Microsoft YaHei',serif;font-size:${fs}px;line-height:1.8;color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;">
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      <div style="font-size:${fs + 6}px;font-weight:700;">${escapeHtml(title)}</div>
      <div style="font-size:${fs - 2}px;color:#555;margin-top:6px;">共 ${questions.length} 题${withAnswer ? '（含答案）' : ''}</div>
    </div>
    ${body}
  </div>`
}

// 渲染 $...$ 公式为 KaTeX HTML
const renderMathHtml = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html
  renderMathInElement(div, {
    delimiters: [{ left: '$', right: '$', display: false }],
    throwOnError: false
  })
  return div.innerHTML
}

// 导出该知识点全部题目为 PDF（打印方式）
const doExport = async () => {
  const all = await getQuestions({ knowledgeTag: tag.value })
  if (!all.length) {
    ElMessage.warning('该知识点下没有题目')
    return
  }
  const rendered = renderMathHtml(buildQuestionsHtml(all, showAnswer.value))
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
    return
  }
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(
      `${tagLabel.value} · 题目集`
    )}</title><style>${katexCss}</style></head><body>${rendered}</body></html>`
  )
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

const load = async () => {
  loading.value = true
  try {
    const params: any = { knowledgeTag: tag.value }
    if (type.value !== 'all') params.type = type.value
    if (difficulty.value != null) params.difficulty = difficulty.value
    list.value = await getQuestions(params)
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/questions')

const openEdit = (row: any) => {
  editing.value = row
  editVisible.value = true
}

const remove = async (row: any) => {
  await ElMessageBox.confirm('确定删除该题目？', '提示', { type: 'warning' })
  await deleteQuestion(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
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
.export-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #555;
  font-size: 13px;
}
</style>
