import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({ baseURL: '/api', timeout: 10000 })

export const TOKEN_KEY = 'admin-token'

// 标记为“已经由全局拦截器提示过”的 API 错误，避免页面 catch 中重复弹提示
export interface ApiError extends Error {
  isApiError?: boolean
}

const createApiError = (message: string): ApiError =>
  Object.assign(new Error(message), { isApiError: true })

// 请求时自动携带登录 Token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 统一解包 { code, message, data }，并对失败请求做统一提示
request.interceptors.response.use(
  (res) => {
    const data = res.data
    if (data.code !== 0) {
      const message = data.message || '请求失败'
      ElMessage.error(message)
      return Promise.reject(createApiError(message))
    }
    return data.data
  },
  (err) => {
    let message = '请求失败，请稍后重试'
    if (!err.response) {
      // 网络断开 / 超时 / 代理未启动
      message =
        err.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络异常，请检查后端服务是否已启动'
    } else if (err.response.status === 401) {
      message = '登录状态已失效，请重新登录'
      const isLoginRequest = err.config?.url?.includes('/auth/login')
      if (!isLoginRequest) {
        localStorage.removeItem(TOKEN_KEY)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    } else if (err.response.status === 403) {
      message = '没有权限执行该操作'
    } else if (err.response.status >= 500) {
      message = '服务器开小差了，请稍后重试'
    } else {
      message = err.response.data?.message || `请求失败（${err.response.status}）`
    }
    ElMessage.error(message)
    return Promise.reject(createApiError(message))
  }
)

// 文件下载专用实例：携带登录 Token，但不做 JSON 解包（下载接口返回的是文件流）
const downloadRequest = axios.create({ baseURL: '/api', timeout: 60000 })

downloadRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

downloadRequest.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// 带认证的文件下载：直接用 <a href> 打开接口地址不会携带 Authorization 头，
// 会被后端 401 拒绝；这里先经 axios 携带 Token 拿到文件流，再触发浏览器下载。
export async function downloadFile(url: string, fallbackName = 'download'): Promise<void> {
  const res = await downloadRequest.get<Blob>(url, { responseType: 'blob' })
  const disposition = res.headers['content-disposition'] || ''
  const match = /filename="?([^";]+)"?/.exec(disposition)
  let filename = match?.[1] || fallbackName
  try {
    filename = decodeURIComponent(filename)
  } catch {
    // 文件名含非法的 % 编码时保持原样
  }
  const blobUrl = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

export default request
