<template>
  <view class="card" @tap="$emit('tap', question.id)">
    <rich-block class="card-title" :content="question.title" :max-lines="4"></rich-block>

    <view class="card-meta">
      <text v-if="typeLabel" class="chip">{{ typeLabel }}</text>
      <text v-if="diffLabel" class="chip chip-diff">{{ diffLabel }}</text>
      <text v-if="knowledgeLabel" class="chip chip-kn">{{ knowledgeLabel }}</text>
    </view>

    <view class="card-foot">
      <text class="foot-text">查看答案与解析</text>
      <text class="foot-arrow">›</text>
    </view>
  </view>
</template>

<script>
// 列表页的题目卡片：只展示题干与标签，答案与解析留给详情页。
// 这样详情页成为唯一的内容页，分享出去的链接也才有意义。
import RichBlock from '@/components/rich-block/rich-block.vue'
import { typeText, stars } from '@/utils/constants'

export default {
  name: 'QuestionCard',
  components: { RichBlock },
  props: {
    question: { type: Object, required: true }
  },
  computed: {
    typeLabel() {
      return typeText(this.question.type)
    },
    diffLabel() {
      return stars(this.question.difficulty)
    },
    knowledgeLabel() {
      const q = this.question
      if (!q.knowledgeTag) return ''
      return q.knowledgeSubTag ? `${q.knowledgeTag} › ${q.knowledgeSubTag}` : q.knowledgeTag
    }
  }
}
</script>

<style>
.card {
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(31, 35, 41, 0.04);
}
.card-title {
  margin-bottom: 18rpx;
}
.card-meta {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
}
.chip {
  font-size: 22rpx;
  line-height: 34rpx;
  padding: 0 14rpx;
  margin: 0 12rpx 8rpx 0;
  border-radius: 4rpx;
  background: #eef1f4;
  color: #5b6472;
}
.chip-diff {
  background: #fdf3e7;
  color: #a9701f;
}
.chip-kn {
  background: #e7f2ec;
  color: #3d7561;
}
.card-foot {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f1f3;
}
.foot-text {
  font-size: 24rpx;
  color: #4c8d74;
}
.foot-arrow {
  font-size: 28rpx;
  color: #b4b9c1;
}
</style>
