<template>
  <el-dialog
    :model-value="modelValue"
    title="AI 生成结论内容"
    width="860px"
    top="5vh"
    append-to-body
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- 顶部：标题/分类只读展示 + 生成提示输入 -->
    <div class="ac-head">
      <div class="ac-meta">
        <span class="ac-meta__label">标题</span>
        <span class="ac-meta__value">{{ title || '（未填写）' }}</span>
      </div>
      <div v-if="categoryName" class="ac-meta">
        <span class="ac-meta__label">分类</span>
        <span class="ac-meta__value">{{ categoryName }}</span>
      </div>
    </div>

    <el-input
      v-model="introText"
      type="textarea"
      :rows="3"
      maxlength="500"
      show-word-limit
      placeholder="可选：补充该结论的要点/范围/适用条件等，帮助 AI 生成更贴切的内容"
      style="margin-bottom: 12px"
    />

    <div class="ac-actions">
      <el-button type="primary" :icon="MagicStick" :loading="loading" @click="generate">{{
        hasResult ? '重新生成' : '生成内容'
      }}</el-button>
      <el-button v-if="hasResult" text :icon="Refresh" :loading="loading" @click="generate"
        >换一版</el-button
      >
    </div>

    <el-alert
      v-if="issueText"
      :title="issueText"
      :type="failedCount ? 'warning' : 'success'"
      :closable="false"
      show-icon
      style="margin: 10px 0 12px"
    />

    <div v-loading="loading" class="ac-preview">
      <div v-if="!hasResult && !loading" class="ac-empty">
        <el-empty
          description="点击「生成内容」，AI 会据此标题产出「结构化讲解 / 典型示例 / 关键要点」三段内容"
        />
      </div>
      <RichContent v-else :html="previewHtml" />
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :icon="Check" :disabled="!hasResult" @click="apply"
        >应用并替换</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Refresh, Check } from '@element-plus/icons-vue'
import { generateConclusion } from '../api/ai'
import { resolveAiCreds } from '../utils/aiConfig'
import { sanitizeRichHtml } from '../utils/sanitizeHtml'
import { normalizeAiMathHtml, validateAiMath } from '../utils/aiMath'
import RichContent from './RichContent.vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  intro?: string
  categoryName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'apply', payload: { content: string; summary: string; tags: string }): void
}>()

const introText = ref(props.intro || '')
const loading = ref(false)
const rawHtml = ref('') // 已消毒、已提取注释后的干净 HTML（用于应用）
const previewHtml = ref('') // 渲染后 HTML（用于预览）
const summary = ref('')
const tags = ref('')
const issueText = ref('')
const failedCount = ref(0)

const hasResult = computed(() => Boolean(rawHtml.value))

const generate = async () => {
  if (!props.title?.trim()) {
    ElMessage.warning('请先在编辑页填写结论标题')
    return
  }
  const creds = await resolveAiCreds()
  if (!creds) {
    try {
      await ElMessageBox.confirm('尚未配置 AI API Key，是否前往「系统设置」进行配置？', '提示', {
        confirmButtonText: '去设置',
        cancelButtonText: '取消',
        type: 'warning'
      })
      emit('update:modelValue', false)
    } catch {
      /* 取消 */
    }
    return
  }

  loading.value = true
  issueText.value = ''
  try {
    const { html } = await generateConclusion({
      title: props.title.trim(),
      intro: introText.value.trim() || undefined,
      categoryName: props.categoryName,
      ...creds
    })
    // 1) 本地公式规范化（Unicode→LaTeX、定界符归一化）
    const { html: normalized } = normalizeAiMathHtml(html || '')
    // 2) 提取 SUMMARY / TAGS 注释（模型按约定放在 HTML 最前）
    const sm = normalized.match(/<!--SUMMARY:(.*?)-->/i)
    const tg = normalized.match(/<!--TAGS:(.*?)-->/i)
    summary.value = sm ? sm[1].trim() : ''
    tags.value = tg ? tg[1].trim() : ''
    // 3) 去掉注释节点，得到干净内容
    const cleaned = normalized
      .replace(/<!--SUMMARY:.*?-->/gi, '')
      .replace(/<!--TAGS:.*?-->/gi, '')
      .trim()
    const safe = sanitizeRichHtml(cleaned)
    rawHtml.value = safe
    previewHtml.value = safe // RichContent 内部会做 sanitize + renderMath
    // 4) 公式校验
    const v = validateAiMath(safe)
    failedCount.value = v.failed.length
    if (v.total && v.failed.length) {
      issueText.value =
        `共 ${v.total} 处公式，其中 ${v.failed.length} 处未能渲染：` +
        v.failed
          .slice(0, 3)
          .map((f) => f.content)
          .join(' ｜ ')
    } else if (v.total === 0) {
      issueText.value = '生成完成（未检测到 $ 公式）'
    } else {
      issueText.value = `生成完成，共 ${v.total} 处公式均能正常渲染`
    }
  } catch (e: any) {
    const isTimeout = e?.code === 'ECONNABORTED' || /超时/.test(e?.message || '')
    ElMessageBox.alert(
      isTimeout ? 'AI 接口响应较慢或暂时不可用，请稍后重试。' : '生成失败，请稍后重试。',
      isTimeout ? 'AI 生成超时' : 'AI 生成失败',
      { confirmButtonText: '知道了', type: isTimeout ? 'warning' : 'error' }
    ).catch(() => {})
  } finally {
    loading.value = false
  }
}

const apply = () => {
  emit('apply', {
    content: rawHtml.value,
    summary: summary.value,
    tags: tags.value
  })
}

const close = () => emit('update:modelValue', false)
</script>

<style scoped>
.ac-head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 10px;
}
.ac-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.ac-meta__label {
  font-size: 12px;
  color: var(--ink-soft);
  flex-shrink: 0;
}
.ac-meta__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ac-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.ac-preview {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.55);
  padding: 14px 18px;
  max-height: 46vh;
  overflow-y: auto;
  min-height: 180px;
}
.ac-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}
</style>
