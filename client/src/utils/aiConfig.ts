// AI 配置（API Key / 接口地址 / 模型）的本地读写，供「系统设置」页和编辑器共用
export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const KEY = 'ai-config'

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { apiKey: '', baseUrl: '', model: '', ...JSON.parse(raw) }
  } catch {
    /* 忽略 */
  }
  return { apiKey: '', baseUrl: '', model: '' }
}

export function saveAiConfig(cfg: AiConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearAiConfig() {
  localStorage.removeItem(KEY)
}
