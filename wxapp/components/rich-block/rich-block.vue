<template>
  <rich-text class="rich-block" :nodes="html" :style="wrapStyle"></rich-text>
</template>

<script>
// 富文本统一入口：所有题干 / 选项 / 解析都走这里，
// 保证图片自适应与公式降级的行为一致。
import { normalizeRichHtml } from '@/utils/richtext'

export default {
  name: 'RichBlock',
  props: {
    content: { type: String, default: '' },
    // 最大显示行数，0 表示不截断（列表页截断，详情页全显）
    maxLines: { type: Number, default: 0 }
  },
  computed: {
    html() {
      return normalizeRichHtml(this.content)
    },
    wrapStyle() {
      if (!this.maxLines) return ''
      return `max-height:${(this.maxLines * 1.75).toFixed(2)}em;overflow:hidden;`
    }
  }
}
</script>

<style>
.rich-block {
  display: block;
  font-size: 30rpx;
  line-height: 1.75;
  color: #1f2329;
  word-break: break-word;
}
</style>
