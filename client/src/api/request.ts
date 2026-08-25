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

export default request
