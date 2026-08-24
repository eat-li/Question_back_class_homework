<template>
  <div ref="root" class="rich-content" v-html="html"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import renderMathInElement from 'katex/contrib/auto-render'

const props = defineProps<{ html: string }>()
const root = ref<HTMLElement>()

// 用 KaTeX auto-render 把 $...$ 公式渲染成数学公式
const renderMath = () => {
  if (!root.value) return
  renderMathInElement(root.value, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false,
    strict: false
  })
}

onMounted(renderMath)

watch(
  () => props.html,
  async () => {
    await nextTick()
    renderMath()
  }
)
</script>

<style scoped>
.rich-content {
  line-height: 1.7;
  color: #303133;
  word-break: break-word;
}
.rich-content :deep(img) {
  max-width: 100%;
}
.rich-content :deep(p) {
  margin: 0 0 4px;
}
</style>
