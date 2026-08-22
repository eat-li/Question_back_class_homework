import axios from 'axios'

const request = axios.create({ baseURL: '/api', timeout: 10000 })

// 统一解包 { code, message, data }
request.interceptors.response.use(
  (res) => {
    const data = res.data
    if (data.code !== 0) return Promise.reject(new Error(data.message || '请求失败'))
    return data.data
  },
  (err) => Promise.reject(err)
)

export default request
