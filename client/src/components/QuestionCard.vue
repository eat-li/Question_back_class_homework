<template>
  <article class="qcard">
    <div class="qcard__head">
      <slot name="handle" />
      <span class="qcard__no">{{ no }}</span>
      <span class="qcard__type" :class="`is-${question.type}`">{{ typeLabel(question.type) }}</span>
      <span class="qcard__diff" :title="`难度 ${question.difficulty || 0}/5`">
        {{ '★'.repeat(question.difficulty || 0) || '—' }}
      </span>
      <template v-if="showTags">
        <span v-if="question.knowledgeTag" class="qcard__tag">{{ question.knowledgeTag }}</span>
        <span v-if="question.knowledgeSubTag" class="qcard__tag is-sub">
          {{ question.knowledgeSubTag }}
        </span>
      </template>
      <div v-if="$slots.tools" class="qcard__tools"><slot name="tools" /></div>
    </div>

    <!-- 题干完整展示，不做行数截断：看题的地方就应该能看全 -->
    <div class="qcard__title" @click="onContentClick">
      <RichContent :html="question.title || ''" />
    </div>

    <div v-if="question.body" class="qcard__body" @click="onContentClick">
      <RichContent :html="question.body" />
    </div>

    <div v-if="options.length" class="qcard__opts">
      <div v-for="(o, j) in options" :key="j" class="qcard__opt">
        <span class="qcard__opt-letter">{{ String.fromCharCode(65 + j) }}.</span><span>{{ o }}</span>
      </div>
    </div>

    <div class="qcard__foot">
      <el-button v-if="question.answer" link type="primary" @click="expanded = !expanded">
        {{ expanded ? '收起答案与解析' : '查看答案与解析' }}
      </el-button>
      <!-- 还没有解析时，这里给一个就地补齐的入口 -->
      <AiAnswerButton
        v-else
        :question="question"
        @generated="(html: string) => emit('generated', html)"
      />
    </div>

    <div v-if="expanded && question.answer" class="qcard__answer" @click="onContentClick">
      <div class="qcard__answer-label">答案与解析</div>
      <RichContent :html="question.answer" />
    </div>

    <el-dialog v-model="previewVisible" title="查看原图" width="70%" top="6vh" append-to-body>
      <div class="qcard__preview"><img :src="previewUrl" alt="题目图片" /></div>
    </el-dialog>
  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import RichContent from './RichContent.vue'
import AiAnswerButton from './AiAnswerButton.vue'
import { questionTypeLabel as typeLabel } from '../utils/format'

const props = withDefaults(
  defineProps<{
    question: any
    /** 题号（由调用方按分页计算） */
    no: number | string
    /** 是否显示知识点标签（知识点页面已按知识点筛选时可关掉） */
    showTags?: boolean
  }>(),
  { showTags: true }
)

// AI 补齐解析后把结果抛给页面，由页面更新它自己那份数据
const emit = defineEmits<{ (e: 'generated', html: string): void }>()

const expanded = ref(false)

// 选项可能是字符串或对象，统一转成可读文本
const options = computed<string[]>(() => {
  const raw = props.question?.options
  if (!Array.isArray(raw)) return []
  return raw.map((o: any) => (typeof o === 'string' ? o : JSON.stringify(o)))
})

// —— 图片点击放大 ——
const previewVisible = ref(false)
const previewUrl = ref('')
const onContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = target.getAttribute('src')
    if (src) {
      previewUrl.value = src
      previewVisible.value = true
    }
  }
}
</script>

<style scoped>
.qcard {
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  padding: 18px 22px;
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.25s ease;
}
.qcard:hover {
  box-shadow: var(--shadow-hover);
}

.qcard__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.qcard__no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--moss-soft);
  color: var(--moss-deep);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 14px;
}
.qcard__type {
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
}
.qcard__type.is-choice {
  background: var(--moss-soft);
  color: var(--moss-deep);
}
.qcard__type.is-fill {
  background: rgba(125, 117, 102, 0.13);
  color: #5c5648;
}
.qcard__type.is-solve {
  background: rgba(95, 111, 76, 0.13);
  color: #4c593d;
}
.qcard__diff {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 13px;
  letter-spacing: 1px;
}
.qcard__tag {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ink-soft);
  background: var(--paper-deep);
  padding: 2px 10px;
  border-radius: 999px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qcard__tag.is-sub {
  color: var(--moss-deep);
  background: var(--moss-soft);
}
/* 调用方塞进来的操作控件（归类下拉、编辑/删除）靠右 */
.qcard__tools {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.qcard__title {
  font-size: 15px;
  color: var(--ink);
  line-height: 1.8;
  word-break: break-word;
}
/* 限制卡片内图片大小，避免大图撑满整屏 */
.qcard__title :deep(img),
.qcard__body :deep(img),
.qcard__answer :deep(img) {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
  cursor: zoom-in;
}
.qcard__body {
  margin-top: 6px;
  font-size: 14px;
  color: var(--ink-regular);
}
.qcard__opts {
  margin: 10px 0 0 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.qcard__opt {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
}
.qcard__opt-letter {
  font-weight: 600;
  color: var(--moss-deep);
  margin-right: 4px;
}

.qcard__foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.qcard__answer {
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-left: 3px solid var(--moss);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qcard__answer-label {
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 6px;
}

.qcard__preview {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 72vh;
  overflow: auto;
}
.qcard__preview img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}
</style>
