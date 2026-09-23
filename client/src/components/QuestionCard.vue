<template>
  <article class="qcard">
    <div class="qcard__rail">
      <slot name="handle" />
      <span class="qcard__no">{{ no }}</span>
      <span class="qcard__no-unit">题</span>
    </div>

    <div class="qcard__main">
      <header class="qcard__head">
        <div class="qcard__meta">
          <span class="qcard__type">{{ typeLabel(question.type) }}</span>
          <span class="qcard__diff">难度 {{ question.difficulty || 0 }} / 5</span>
          <span
            v-if="showTags && (question.knowledgeTag || question.knowledgeSubTag)"
            class="qcard__divider"
            aria-hidden="true"
          ></span>
          <span v-if="showTags && question.knowledgeTag" class="qcard__tag">
            {{ question.knowledgeTag }}
          </span>
          <span
            v-if="showTags && question.knowledgeTag && question.knowledgeSubTag"
            class="qcard__path-separator"
            aria-hidden="true"
          >
            /
          </span>
          <span v-if="showTags && question.knowledgeSubTag" class="qcard__tag">
            {{ question.knowledgeSubTag }}
          </span>
        </div>
        <div v-if="$slots.tools" class="qcard__tools"><slot name="tools" /></div>
      </header>

      <!-- 题干完整展示，不做行数截断：看题的地方就应该能看全 -->
      <div class="qcard__title" @click="onContentClick">
        <RichContent :html="question.title || ''" />
      </div>

      <div v-if="question.body" class="qcard__body" @click="onContentClick">
        <RichContent :html="question.body" />
      </div>

      <div v-if="options.length" class="qcard__opts">
        <div v-for="(o, j) in options" :key="j" class="qcard__opt">
          <span class="qcard__opt-letter">{{ String.fromCharCode(65 + j) }}</span>
          <span>{{ o }}</span>
        </div>
      </div>

      <footer class="qcard__foot">
        <el-button
          v-if="question.answer"
          link
          type="primary"
          :icon="expanded ? ArrowUp : ArrowDown"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起参考答案' : '展开参考答案' }}
        </el-button>
        <!-- 还没有解析时，这里给一个就地补齐的入口 -->
        <AiAnswerButton
          v-else
          :question="question"
          @generated="(html: string) => emit('generated', html)"
        />
      </footer>

      <section v-if="expanded && question.answer" class="qcard__answer" @click="onContentClick">
        <div class="qcard__answer-label">参考答案与解析</div>
        <RichContent :html="question.answer" />
      </section>
    </div>

    <el-dialog v-model="previewVisible" title="查看原图" width="70%" top="6vh" append-to-body>
      <div class="qcard__preview"><img :src="previewUrl" alt="题目图片" /></div>
    </el-dialog>
  </article>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import RichContent from './RichContent.vue'
import AiAnswerButton from './AiAnswerButton.vue'
import { questionTypeLabel as typeLabel } from '../utils/format'
import type { Question } from '../types'

const props = withDefaults(
  defineProps<{
    question: Question
    /** 题号（由调用方按分页计算） */
    no: number | string
    /** 是否显示知识点标签（知识点页面已按知识点筛选时可关掉） */
    showTags?: boolean
  }>(),
  { showTags: true }
)

// AI 补齐解析后把结果抛给页面，由页面更新它自己那份数据
const emit = defineEmits<{ generated: [html: string] }>()

const expanded = shallowRef(false)

// 选项可能是字符串或对象，统一转成可读文本
const options = computed<string[]>(() => {
  const raw = props.question?.options
  if (!Array.isArray(raw)) return []
  return raw.map((o: any) => (typeof o === 'string' ? o : JSON.stringify(o)))
})

// —— 图片点击放大 ——
const previewVisible = shallowRef(false)
const previewUrl = shallowRef('')
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
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(24, 30, 36, 0.06);
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
.qcard:hover {
  border-color: rgba(150, 104, 26, 0.34);
  box-shadow: 0 8px 20px -16px rgba(24, 30, 36, 0.56);
}

.qcard__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 17px 8px;
  background: var(--surface-muted);
  border-right: 1px solid var(--hair);
  color: var(--ink-soft);
}
.qcard__main {
  min-width: 0;
  padding: 17px 22px 15px;
}

.qcard__head {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 30px;
  margin-bottom: 13px;
}
.qcard__no {
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  font-size: 19px;
  line-height: 1.2;
  color: var(--ink);
}
.qcard__no-unit {
  font-size: 10px;
  color: var(--ink-soft);
}
.qcard__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  gap: 7px;
  color: var(--ink-soft);
  font-size: 12px;
}
.qcard__type {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 600;
  color: var(--ink-regular);
}
.qcard__type::before {
  content: '';
  width: 2px;
  height: 13px;
  background: var(--moss);
}
.qcard__diff {
  flex-shrink: 0;
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
}
.qcard__divider {
  width: 1px;
  height: 12px;
  margin: 0 2px;
  background: var(--line-strong);
}
.qcard__tag,
.qcard__path-separator {
  flex-shrink: 0;
  color: var(--ink-soft);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.qcard__path-separator {
  color: var(--line-strong);
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
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink);
  line-height: 1.85;
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
  margin-top: 8px;
  font-size: 14px;
  color: var(--ink-regular);
}
.qcard__opts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 7px 20px;
  margin-top: 13px;
}
.qcard__opt {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
}
.qcard__opt-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  background: var(--surface-muted);
  font-family: var(--font-data);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-regular);
}

.qcard__foot {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--hair);
}
.qcard__answer {
  margin: 8px -22px -15px;
  padding: 15px 22px 17px;
  background: var(--surface-muted);
  border-top: 1px solid var(--line-strong);
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.qcard__answer-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--moss-deep);
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

@media (max-width: 700px) {
  .qcard {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .qcard__rail {
    padding: 15px 5px;
  }

  .qcard__main {
    padding: 14px 14px 13px;
  }

  .qcard__head {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 9px;
  }

  .qcard__tools {
    width: 100%;
    margin-left: 0;
    flex-wrap: wrap;
  }

  .qcard__opts {
    grid-template-columns: 1fr;
  }

  .qcard__answer {
    margin: 8px -14px -13px;
    padding: 14px;
  }
}
</style>
