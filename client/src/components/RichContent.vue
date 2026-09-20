<template>
  <div class="rich-content" v-html="safeHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeRichHtml } from '../utils/sanitizeHtml'
import { renderMathInHtml } from '../utils/mathRender'

const props = defineProps<{ html: string }>()

// 消毒后再做字符串级 KaTeX 渲染：$...$ / $$...$$ 跨 <br> 也能正确匹配
const safeHtml = computed(() => renderMathInHtml(sanitizeRichHtml(props.html || '')))
</script>

<style scoped>
.rich-content {
  line-height: 1.7;
  color: var(--ink);
  word-break: break-word;
}
.rich-content :deep(img) {
  max-width: 100%;
}
.rich-content :deep(p) {
  margin: 0 0 4px;
}
/* 表格（含 Markdown 转换的表格） */
.rich-content :deep(.tableWrapper) {
  overflow-x: auto;
  margin: 8px 0;
}
.rich-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.rich-content :deep(th),
.rich-content :deep(td) {
  border: 1px solid #d8d2c4;
  padding: 6px 10px;
  vertical-align: top;
  text-align: left;
}
.rich-content :deep(th) {
  background: #f3eddf;
  font-weight: 600;
}
</style>
