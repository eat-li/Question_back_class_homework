// 轻量进程内缓存：用于高频只读、变化不频繁的接口，降低数据库查询压力。
// 单机单实例应用足够；以 TTL 控制数据新鲜度，过期自动失效。
const store = new Map()

function cacheGet(key) {
  const hit = store.get(key)
  if (!hit) return undefined
  if (Date.now() > hit.expireAt) {
    store.delete(key)
    return undefined
  }
  return hit.value
}

function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expireAt: Date.now() + (ttlMs || 10000) })
}

module.exports = { cacheGet, cacheSet }
