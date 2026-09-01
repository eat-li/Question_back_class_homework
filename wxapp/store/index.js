// 极简全局状态。
// 只有「跨页面共享」的数据才放这里：列表页把当页的 id 序列交给详情页，
// 详情页才能上下翻题；单页内部的状态一律留在页面 data 里，避免多余的响应式开销。
import { reactive } from 'vue'

const HISTORY_KEY = 'bank:search-history'
const HISTORY_MAX = 8

export const store = reactive({
  // 列表 → 详情的上下文
  bankContext: {
    ids: [],
    filters: null
  },

  setBankContext(ids, filters) {
    this.bankContext.ids = ids || []
    this.bankContext.filters = filters || null
  },

  clearBankContext() {
    this.bankContext.ids = []
    this.bankContext.filters = null
  },

  // 返回某道题在当前列表中的上一题 / 下一题 id；不在上下文里则返回 null
  neighbors(id) {
    const ids = this.bankContext.ids
    const idx = ids.indexOf(Number(id))
    if (idx < 0) return { index: -1, total: 0, prev: null, next: null }
    return {
      index: idx,
      total: ids.length,
      prev: idx > 0 ? ids[idx - 1] : null,
      next: idx < ids.length - 1 ? ids[idx + 1] : null
    }
  },

  // ---- 搜索历史 ----
  history: [],

  loadHistory() {
    try {
      this.history = uni.getStorageSync(HISTORY_KEY) || []
    } catch (e) {
      this.history = []
    }
    return this.history
  },

  pushHistory(kw) {
    const key = String(kw || '').trim()
    if (!key) return
    this.history = [key].concat(this.history.filter((k) => k !== key)).slice(0, HISTORY_MAX)
    try {
      uni.setStorageSync(HISTORY_KEY, this.history)
    } catch (e) {
      /* ignore */
    }
  },

  clearHistory() {
    this.history = []
    try {
      uni.removeStorageSync(HISTORY_KEY)
    } catch (e) {
      /* ignore */
    }
  }
})

export default store
