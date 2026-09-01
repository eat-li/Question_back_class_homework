<template>
  <view class="page">
    <scroll-view class="body" scroll-y :scroll-top="scrollTop">
      <view class="inner">
        <view v-if="question" class="content">
          <view class="meta">
            <text v-if="typeLabel" class="chip">{{ typeLabel }}</text>
            <text v-if="diffLabel" class="chip chip-diff">{{ diffLabel }}</text>
            <text v-if="knowledgeLabel" class="chip chip-kn">{{ knowledgeLabel }}</text>
            <text v-if="nav.total" class="chip chip-pos">{{ nav.index + 1 }} / {{ nav.total }}</text>
          </view>

          <rich-block class="title" :content="question.title"></rich-block>

          <view v-if="options.length" class="opts">
            <view v-for="(o, i) in options" :key="i" class="opt">
              <text class="opt-k">{{ letters[i] }}.</text>
              <rich-block class="opt-v" :content="o"></rich-block>
            </view>
          </view>

          <view v-if="question.body" class="sec">
            <text class="sec-t">补充说明</text>
            <rich-block class="sec-c" :content="question.body"></rich-block>
          </view>

          <view class="answer">
            <view v-if="!showAnswer" class="answer-lock" @tap="showAnswer = true">
              <text class="answer-lock-text">点击展开答案与解析</text>
            </view>
            <block v-else>
              <text class="sec-t">答案与解析</text>
              <rich-block v-if="question.answer" class="sec-c" :content="question.answer"></rich-block>
              <text v-else class="sec-empty">这道题还没有录入解析</text>
            </block>
          </view>

          <view v-if="images.length" class="img-entry" @tap="previewImages">
            <text class="img-entry-text">查看原题图（{{ images.length }} 张，可双指放大）</text>
          </view>
        </view>

        <empty-state
          v-else-if="!loading"
          text="题目不存在或已被删除"
          action-text="回到题库"
          @action="backToList"
        ></empty-state>
      </view>
    </scroll-view>

    <view class="footer">
      <template v-if="nav.total">
        <view class="f-btn" :class="{ off: !nav.prev }" @tap="goPrev">上一题</view>
        <button class="f-btn f-primary" open-type="share">分享这道题</button>
        <view class="f-btn" :class="{ off: !nav.next }" @tap="goNext">下一题</view>
      </template>
      <template v-else>
        <view class="f-btn" @tap="backToList">回到题库</view>
        <button class="f-btn f-primary" open-type="share">分享这道题</button>
      </template>
    </view>
  </view>
</template>

<script>
import api from '@/api/question'
import store from '@/store/index.js'
import { normalizeRichHtml, extractImages, richTextToPlain } from '@/utils/richtext'
import { typeText, stars, normalizeOptions, OPTION_LETTERS } from '@/utils/constants'
import RichBlock from '@/components/rich-block/rich-block.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'

export default {
  components: { RichBlock, EmptyState },
  data() {
    return {
      id: null,
      question: null,
      loading: false,
      showAnswer: false,
      scrollTop: 0,
      letters: OPTION_LETTERS,
      nav: { index: -1, total: 0, prev: null, next: null }
    }
  },
  computed: {
    options() {
      return normalizeOptions(this.question && this.question.options).map((t) =>
        normalizeRichHtml(t)
      )
    },
    images() {
      // 题干 + 解析里的图片一起收集，题目截图往往比文字更好看
      const q = this.question
      if (!q) return []
      return extractImages(q.title).concat(extractImages(q.answer), extractImages(q.body))
    },
    typeLabel() {
      return this.question ? typeText(this.question.type) : ''
    },
    diffLabel() {
      return this.question ? stars(this.question.difficulty) : ''
    },
    knowledgeLabel() {
      if (!this.question || !this.question.knowledgeTag) return ''
      const q = this.question
      return q.knowledgeSubTag ? `${q.knowledgeTag} › ${q.knowledgeSubTag}` : q.knowledgeTag
    },
    shareTitle() {
      if (!this.question) return '一道数学题'
      const brief = richTextToPlain(this.question.title)
      const text = brief.length > 24 ? brief.slice(0, 24) + '…' : brief
      const tag = this.question.knowledgeTag || this.typeLabel || '数学题'
      return text ? `${tag}｜${text}` : `${tag}｜进来看看`
    }
  },
  onLoad(options) {
    this.id = Number(options.id)
    this.loadDetail(this.id)
  },
  // 右上角转发：家长群 / 私聊传播的主要入口
  onShareAppMessage() {
    return {
      title: this.shareTitle,
      path: `/pages/bank/detail?id=${this.id}`,
      imageUrl: this.images.length ? this.images[0] : ''
    }
  },
  // 朋友圈分享
  onShareTimeline() {
    return {
      title: this.shareTitle,
      query: `id=${this.id}`,
      imageUrl: this.images.length ? this.images[0] : ''
    }
  },
  methods: {
    loadDetail(id) {
      this.loading = true
      this.showAnswer = false
      api
        .detail(id)
        .then((q) => {
          this.question = q && q.id ? q : null
          this.nav = store.neighbors(id)
          this.resetScroll()
        })
        .catch(() => {
          this.question = null
        })
        .then(() => {
          this.loading = false
        })
    },
    // scroll-top 绑定同一个值不会触发滚动，用 0 / 1 交替来强制回到顶部
    resetScroll() {
      this.scrollTop = this.scrollTop === 0 ? 1 : 0
    },
    goPrev() {
      if (this.nav.prev) this.jump(this.nav.prev)
    },
    goNext() {
      if (this.nav.next) this.jump(this.nav.next)
    },
    jump(id) {
      this.id = id
      this.loadDetail(id)
    },
    previewImages() {
      uni.previewImage({ urls: this.images, current: this.images[0] })
    },
    backToList() {
      uni.reLaunch({ url: '/pages/bank/list' })
    }
  }
}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f6f8;
}
.body {
  flex: 1;
  height: 0;
}
.inner {
  padding: 24rpx 24rpx 40rpx;
}
.content {
  background: #fff;
  border-radius: 12rpx;
  padding: 30rpx 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(31, 35, 41, 0.04);
}

.meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-bottom: 20rpx;
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
.chip-pos {
  background: #f2f3f5;
  color: #9ca3af;
}

.title {
  margin-bottom: 8rpx;
}

.opts {
  margin-top: 20rpx;
}
.opt {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.opt-k {
  font-size: 30rpx;
  line-height: 1.75;
  color: #4c8d74;
  margin-right: 12rpx;
}
.opt-v {
  flex: 1;
}

.sec {
  margin-top: 28rpx;
}
.sec-t {
  display: block;
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 10rpx;
}
.sec-c {
  font-size: 29rpx;
}
.sec-empty {
  font-size: 26rpx;
  color: #9ca3af;
}

.answer {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx dashed #e5e7eb;
}
.answer-lock {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: #f7f9f8;
  border-radius: 8rpx;
}
.answer-lock-text {
  font-size: 27rpx;
  color: #4c8d74;
}

.img-entry {
  margin-top: 28rpx;
  padding: 20rpx 24rpx;
  background: #f2f3f5;
  border-radius: 8rpx;
}
.img-entry-text {
  font-size: 26rpx;
  color: #5b6472;
}

.footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  /* 先给一个不含 env() 的值兜底，个别基础库不支持 rpx 与 env() 混算时会整条丢弃 */
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f1f3;
}
.f-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 28rpx;
  color: #4a5560;
  background: #f2f3f5;
  border-radius: 8rpx;
  margin: 0 8rpx;
  padding: 0;
  border: none;
}
.f-btn::after {
  border: none;
}
.f-btn.off {
  color: #c4c9d1;
}
.f-primary {
  color: #fff;
  background: #4c8d74;
}
</style>
