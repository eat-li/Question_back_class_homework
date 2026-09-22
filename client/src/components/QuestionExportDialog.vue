<template>
  <el-dialog
    :model-value="modelValue"
    title="导出题目 PDF"
    width="460px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <div class="scope">
      <span class="scope__label">导出范围</span>
      <span class="scope__name">{{ scopeLabel }}</span>
      <span class="scope__count">{{ loading ? '统计中…' : `${questions.length} 题` }}</span>
    </div>

    <el-form label-width="104px" class="opts">
      <el-form-item label="答案与解析">
        <el-switch v-model="withAnswer" />
        <span class="hint">开启后答案直接印在题目下方</span>
      </el-form-item>
      <el-form-item label="答题留白">
        <el-switch v-model="showAnswerArea" />
        <el-input-number
          v-if="showAnswerArea"
          v-model="answerAreaHeight"
          :min="20"
          :max="500"
          :step="20"
          size="small"
          style="margin-left: 10px; width: 110px"
        />
        <span v-if="showAnswerArea" class="hint">像素高</span>
      </el-form-item>
      <el-form-item v-if="allowGroup" label="按知识点分组">
        <el-switch v-model="groupByKnowledge" />
        <span class="hint">按一级知识点分节，便于成册</span>
      </el-form-item>
    </el-form>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="点「导出 PDF」会打开打印窗口，在目标打印机里选「另存为 PDF」即可保存；打印时建议在「更多设置」中取消勾选页眉页脚。"
    />

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button
        type="primary"
        :loading="busy"
        :disabled="loading || !questions.length"
        @click="doExport"
      >
        导出 PDF
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAllQuestions } from '../api/question'
import type { QuestionQuery } from '../api/question'
import { buildQuestionPaperHtml } from '../utils/questionPaper'
import { printHtml } from '../utils/printHtml'

const props = defineProps<{
  modelValue: boolean
  /** 导出范围（筛选条件）；不传即整个题库 */
  scope?: QuestionQuery
  /** 范围名称：同时作为对话框里的说明与试卷大标题 */
  scopeLabel: string
  /** 是否提供「按知识点分组」（整库导出才有意义） */
  allowGroup?: boolean
  /** 试卷副标题（如筛选条件描述） */
  subtitle?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const loading = ref(false)
const busy = ref(false)
const questions = ref<any[]>([])
const withAnswer = ref(false)
const showAnswerArea = ref(false)
const answerAreaHeight = ref(100)
const groupByKnowledge = ref(false)

const onOpen = async () => {
  groupByKnowledge.value = Boolean(props.allowGroup)
  withAnswer.value = false
  showAnswerArea.value = false
  loading.value = true
  try {
    questions.value = await getAllQuestions(props.scope || {})
  } catch {
    // 错误提示已由 request.ts 统一弹出
    questions.value = []
  } finally {
    loading.value = false
  }
}

const doExport = async () => {
  if (!questions.value.length) {
    ElMessage.warning('当前范围没有题目')
    return
  }
  busy.value = true
  // 题量大时 renderMath + 打印窗口写入会占用主线程，先让浏览器把 loading 画出来再开工
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
  try {
    const title = `${props.scopeLabel} · 题目集`
    const opened = printHtml(
      title,
      buildQuestionPaperHtml({
        title,
        subtitle: props.subtitle || '',
        questions: questions.value,
        withAnswer: withAnswer.value,
        answerAreaHeight: showAnswerArea.value ? answerAreaHeight.value : 0,
        groupByKnowledge: groupByKnowledge.value
      })
    )
    if (!opened) {
      ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
      return
    }
    emit('update:modelValue', false)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.scope {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--paper-deep);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.scope__label {
  font-size: 13px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.scope__name {
  font-weight: 700;
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.scope__count {
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--moss-deep);
  background: var(--moss-soft);
  border-radius: 999px;
  padding: 3px 9px;
}
.opts {
  margin-bottom: 4px;
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--ink-soft);
}
</style>
