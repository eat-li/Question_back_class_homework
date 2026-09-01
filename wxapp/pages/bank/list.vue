<template>
  <view class="page">
    <!-- 搜索：输入即搜（300ms 防抖），聚焦且无关键词时展示历史 -->
    <view class="search">
      <view class="search-box">
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索题干关键词，如「抛物线」"
          placeholder-class="search-ph"
          confirm-type="search"
          :focus="false"
          @focus="onFocus"
          @blur="onBlur"
          @input="onInput"
          @confirm="onSearch"
        />
        <view v-if="keyword" class="search-clear" @tap="onClear">×</view>
      </view>
    </view>

    <view v-if="showHistory" class="history">
      <view class="history-head">
        <text class="history-title">最近搜索</text>
        <text class="history-clear" @tap="clearHistory">清空</text>
      </view>
      <view class="history-tags">
        <text
          v-for="k in history"
          :key="k"
          class="history-tag"
          @tap="applyHistory(k)"
          >{{ k }}</text
        >
      </view>
    </view>

    <!-- 视图切换 -->
    <view class="segment">
      <view class="seg-item" :class="{ on: view === 'list' }" @tap="switchView('list')">题目</view>
      <view class="seg-item" :class="{ on: view === 'knowledge' }" @tap="switchView('knowledge')">
        知识点
      </view>
    </view>

    <!-- ============ 题目列表 ============ -->
    <block v-if="view === 'list'">
      <view class="filter-row">
        <view class="type-tabs">
          <view
            v-for="t in typeTabs"
            :key="t.value"
            class="type-tab"
            :class="{ on: type === t.value }"
            @tap="onType(t.value)"
            >{{ t.label }}</view
          >
        </view>
        <picker :range="difficultyOptions" :value="difficultyIndex" @change="onDifficulty">
          <view class="picker">{{ difficultyOptions[difficultyIndex] }} ▾</view>
        </picker>
      </view>

      <view v-if="activeTagLabel" class="active-row">
        <text class="active-tag" @tap="clearKnowledge">{{ activeTagLabel }} ×</text>
        <text v-if="keyword" class="active-tag" @tap="onClear">关键词：{{ keyword }} ×</text>
      </view>

      <view v-if="list.length" class="q-list">
        <question-card
          v-for="(q, i) in list"
          :key="q.id"
          :question="q"
          @tap="openDetail(q.id, i)"
        ></question-card>
        <view class="list-foot">
          <text v-if="loading">加载中…</text>
          <text v-else-if="!hasMore">没有更多了</text>
          <text v-else class="foot-more" @tap="loadMore">加载更多</text>
        </view>
      </view>

      <empty-state
        v-else-if="!loading"
        :text="emptyText"
        :hint="emptyHint"
        :action-text="hasFilter ? '清除筛选条件' : ''"
        @action="resetFilters"
      ></empty-state>

      <view v-if="error && !list.length" class="error-tip">
        <text>{{ error }}</text>
        <text class="error-retry" @tap="reload">重试</text>
      </view>
    </block>

    <!-- ============ 知识点 ============ -->
    <block v-else>
      <view v-if="knowledge.length" class="kn-list">
        <view v-for="item in knowledge" :key="item.tag" class="kn-card" @tap="pickTag(item)">
          <view class="kn-head">
            <text class="kn-name">{{ item.label }}</text>
            <text class="kn-total">{{ item.total }} 题</text>
          </view>
          <view class="kn-bar">
            <view class="kn-seg seg-choice" :style="{ width: seg(item.choice, item.total) }"></view>
            <view class="kn-seg seg-fill" :style="{ width: seg(item.fill, item.total) }"></view>
            <view class="kn-seg seg-solve" :style="{ width: seg(item.solve, item.total) }"></view>
          </view>
          <view class="kn-legend">
            <text class="lg lg-choice">选择 {{ item.choice }}</text>
            <text class="lg lg-fill">填空 {{ item.fill }}</text>
            <text class="lg lg-solve">解答 {{ item.solve }}</text>
          </view>
          <view v-if="item.subTags.length" class="kn-subs">
            <text
              v-for="s in item.subTags.slice(0, 6)"
              :key="s.name"
              class="kn-sub"
              @tap.stop="pickSub(item, s)"
              >{{ s.name }} {{ s.total }}</text
            >
          </view>
        </view>
      </view>
      <empty-state
        v-else-if="!knLoading"
        text="还没有知识点"
        hint="在管理后台给题目打上知识点标签后，这里会自动汇总"
      ></empty-state>
    </block>
  </view>
</template>

<script>
import api from '@/api/question'
import store from '@/store/index.js'
import config from '@/config/index.js'
import { cacheGet, cacheSet } from '@/utils/storage'
import { TYPE_TABS, DIFFICULTY_OPTIONS } from '@/utils/constants'
import QuestionCard from '@/components/question-card/question-card.vue'
import EmptyState from '@/components/empty-state/empty-state.vue'

const KN_CACHE_KEY = 'knowledge-stats'
let searchTimer = null

export default {
  components: { QuestionCard, EmptyState },
  data() {
    return {
      view: 'list',
      typeTabs: TYPE_TABS,
      difficultyOptions: DIFFICULTY_OPTIONS,

      keyword: '',
      type: 'all',
      difficultyIndex: 0,
      tag: '',
      subTag: '',

      list: [],
      page: 1,
      total: 0,
      loading: false,
      error: '',

      knowledge: [],
      knLoading: false,

      focused: false,
      history: []
    }
  },
  computed: {
    hasMore() {
      return this.list.length < this.total
    },
    hasFilter() {
      return !!(this.keyword.trim() || this.type !== 'all' || this.difficultyIndex > 0 || this.tag)
    },
    activeTagLabel() {
      if (!this.tag) return ''
      const main = this.tag === '__empty__' ? '未分类' : this.tag
      return this.subTag ? `${main} › ${this.subTag}` : main
    },
    showHistory() {
      return this.focused && !this.keyword && this.history.length > 0
    },
    emptyText() {
      return this.error ? '' : this.hasFilter ? '没有符合条件的题目' : '题库还是空的'
    },
    emptyHint() {
      return this.hasFilter ? '换个关键词，或放宽筛选条件试试' : '在管理后台录入题目后，这里会同步显示'
    }
  },
  onLoad() {
    this.history = store.loadHistory()
    this.loadKnowledge()
    this.load(true)
  },
  onUnload() {
    if (searchTimer) clearTimeout(searchTimer)
  },
  onPullDownRefresh() {
    this.loadKnowledge(true)
    this.load(true)
  },
  onReachBottom() {
    if (this.view === 'list' && !this.loading && this.hasMore) this.load(false)
  },
  methods: {
    // ---------- 数据 ----------
    load(reset) {
      if (this.loading) return
      if (reset) this.page = 1
      this.loading = true
      this.error = ''

      const params = { page: this.page, pageSize: config.PAGE_SIZE }
      const kw = this.keyword.trim()
      if (kw) params.keyword = kw
      if (this.type !== 'all') params.type = this.type
      if (this.difficultyIndex > 0) params.difficulty = this.difficultyIndex
      if (this.tag) params.knowledgeTag = this.tag
      if (this.subTag) params.knowledgeSubTag = this.subTag

      api
        .list(params)
        .then((res) => {
          const rows = (res && res.list) || []
          this.list = reset ? rows : this.list.concat(rows)
          this.total = (res && res.total) || 0
          this.page = ((res && res.page) || this.page) + 1
        })
        .catch((e) => {
          this.error = e.message || '加载失败'
          if (reset) this.list = []
        })
        .then(() => {
          this.loading = false
          uni.stopPullDownRefresh()
        })
    },
    loadMore() {
      this.load(false)
    },
    reload() {
      this.load(true)
    },
    loadKnowledge(force) {
      if (!force) {
        const cached = cacheGet(KN_CACHE_KEY)
        if (cached) {
          this.knowledge = cached
          return
        }
      }
      this.knLoading = true
      api
        .stats()
        .then((res) => {
          this.knowledge = res || []
          cacheSet(KN_CACHE_KEY, this.knowledge, config.CACHE_TTL.KNOWLEDGE)
        })
        .catch(() => {
          if (!this.knowledge.length) this.knowledge = []
        })
        .then(() => {
          this.knLoading = false
        })
    },

    // ---------- 交互 ----------
    onInput() {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => this.onSearch(), 300)
    },
    onSearch() {
      if (searchTimer) clearTimeout(searchTimer)
      this.focused = false
      store.pushHistory(this.keyword.trim())
      this.history = store.history
      this.load(true)
    },
    onFocus() {
      this.focused = true
    },
    // blur 会先于历史标签的 tap 触发，延迟一下避免面板提前消失
    onBlur() {
      setTimeout(() => {
        this.focused = false
      }, 200)
    },
    onClear() {
      this.keyword = ''
      this.load(true)
    },
    applyHistory(kw) {
      this.keyword = kw
      this.onSearch()
    },
    clearHistory() {
      store.clearHistory()
      this.history = []
    },
    onType(v) {
      this.type = v
      this.load(true)
    },
    onDifficulty(e) {
      this.difficultyIndex = Number(e.detail.value)
      this.load(true)
    },
    switchView(v) {
      this.view = v
    },
    pickTag(item) {
      this.tag = item.tag
      this.subTag = ''
      this.view = 'list'
      this.load(true)
    },
    pickSub(item, s) {
      this.tag = item.tag
      this.subTag = s.name
      this.view = 'list'
      this.load(true)
    },
    clearKnowledge() {
      this.tag = ''
      this.subTag = ''
      this.load(true)
    },
    resetFilters() {
      this.keyword = ''
      this.type = 'all'
      this.difficultyIndex = 0
      this.tag = ''
      this.subTag = ''
      this.load(true)
    },
    openDetail(id) {
      // 把当页 id 序列交给详情页，详情页才能上下翻题
      store.setBankContext(
        this.list.map((q) => q.id),
        {
          keyword: this.keyword.trim(),
          type: this.type,
          difficultyIndex: this.difficultyIndex,
          tag: this.tag,
          subTag: this.subTag
        }
      )
      uni.navigateTo({ url: '/pages/bank/detail?id=' + id })
    },
    seg(n, total) {
      if (!total) return '0%'
      return ((Number(n) || 0) / total) * 100 + '%'
    }
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 40rpx;
}

/* 搜索 */
.search {
  padding: 20rpx 24rpx 16rpx;
  background: #fff;
}
.search-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 68rpx;
  padding: 0 24rpx;
  background: #f2f3f5;
  border-radius: 8rpx;
}
.search-input {
  flex: 1;
  height: 68rpx;
  font-size: 28rpx;
  color: #1f2329;
}
.search-ph {
  color: #9ca3af;
}
.search-clear {
  width: 44rpx;
  text-align: center;
  font-size: 32rpx;
  color: #9ca3af;
}

/* 搜索历史 */
.history {
  padding: 8rpx 24rpx 20rpx;
  background: #fff;
  border-top: 1rpx solid #f0f1f3;
}
.history-head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}
.history-title {
  font-size: 24rpx;
  color: #9ca3af;
}
.history-clear {
  font-size: 24rpx;
  color: #9ca3af;
}
.history-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.history-tag {
  font-size: 26rpx;
  color: #4a5560;
  background: #f2f3f5;
  border-radius: 4rpx;
  padding: 8rpx 20rpx;
  margin: 0 16rpx 12rpx 0;
}

/* 视图切换 */
.segment {
  display: flex;
  flex-direction: row;
  padding: 20rpx 24rpx 12rpx;
}
.seg-item {
  font-size: 28rpx;
  color: #6b7280;
  padding: 0 4rpx 12rpx;
  margin-right: 40rpx;
  border-bottom: 4rpx solid transparent;
}
.seg-item.on {
  color: #1f2329;
  border-bottom-color: #4c8d74;
}

/* 筛选 */
.filter-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 24rpx 16rpx;
}
.type-tabs {
  display: flex;
  flex-direction: row;
}
.type-tab {
  font-size: 26rpx;
  color: #6b7280;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 4rpx;
  padding: 8rpx 22rpx;
  margin-right: 12rpx;
}
.type-tab.on {
  color: #fff;
  background: #4c8d74;
  border-color: #4c8d74;
}
.picker {
  font-size: 26rpx;
  color: #1f2329;
  background: #fff;
  border: 1rpx solid #e5e7eb;
  border-radius: 4rpx;
  padding: 8rpx 20rpx;
}

.active-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 0 24rpx 12rpx;
}
.active-tag {
  font-size: 24rpx;
  color: #3d7561;
  background: #e7f2ec;
  border-radius: 4rpx;
  padding: 8rpx 18rpx;
  margin: 0 12rpx 8rpx 0;
}

/* 列表 */
.q-list {
  padding: 0 24rpx;
}
.list-foot {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}
.foot-more {
  color: #4c8d74;
}

.error-tip {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 40rpx 24rpx;
  font-size: 26rpx;
  color: #9ca3af;
}
.error-retry {
  margin-left: 24rpx;
  color: #4c8d74;
}

/* 知识点 */
.kn-list {
  padding: 0 24rpx;
}
.kn-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(31, 35, 41, 0.04);
}
.kn-head {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
}
.kn-name {
  font-size: 32rpx;
  color: #1f2329;
}
.kn-total {
  font-size: 24rpx;
  color: #9ca3af;
}
.kn-bar {
  display: flex;
  flex-direction: row;
  height: 10rpx;
  margin: 20rpx 0 14rpx;
  background: #f0f1f3;
  border-radius: 5rpx;
  overflow: hidden;
}
.kn-seg {
  height: 10rpx;
}
.seg-choice {
  background: #4c8d74;
}
.seg-fill {
  background: #c9a227;
}
.seg-solve {
  background: #6b7f9e;
}
.kn-legend {
  display: flex;
  flex-direction: row;
}
.lg {
  font-size: 22rpx;
  color: #9ca3af;
  margin-right: 24rpx;
}
.kn-subs {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #f0f1f3;
}
.kn-sub {
  font-size: 24rpx;
  color: #5b6472;
  background: #f2f3f5;
  border-radius: 4rpx;
  padding: 8rpx 18rpx;
  margin: 0 12rpx 10rpx 0;
}
</style>
