// 轻量进程内缓存：用于高频只读、变化不频繁的接口，降低数据库查询压力。
// 单机单实例应用足够；以 TTL 控制数据新鲜度，过期自动失效。
const store = new Map()
const MAX_ENTRIES = Number(process.env.CACHE_MAX_ENTRIES) || 200

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
  const now = Date.now()
  for (const [cacheKey, hit] of store) {
    if (now > hit.expireAt) store.delete(cacheKey)
  }
  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value
    if (oldestKey === undefined) break
    store.delete(oldestKey)
  }
  store.set(key, { value, expireAt: Date.now() + (ttlMs || 10000) })
}

function cacheDel(key) {
  store.delete(key)
}

function cacheDelByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheDelByPrefix }
