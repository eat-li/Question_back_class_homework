// 带过期时间的本地缓存。
// 知识点、标签这类数据几分钟内不会变，缓存一层可以让二次进入几乎秒开。
const PREFIX = 'cache:'

export function cacheGet(key) {
  try {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw || !raw.exp) return null
    if (raw.exp < Date.now()) {
      uni.removeStorageSync(PREFIX + key)
      return null
    }
    return raw.data
  } catch (e) {
    return null
  }
}

export function cacheSet(key, data, ttl) {
  try {
    uni.setStorageSync(PREFIX + key, { data, exp: Date.now() + ttl })
  } catch (e) {
    /* 存储写满时静默失败，不影响主流程 */
  }
}

export function cacheClear(key) {
  try {
    uni.removeStorageSync(PREFIX + key)
  } catch (e) {
    /* ignore */
  }
}

export default { cacheGet, cacheSet, cacheClear }
