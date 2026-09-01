// 请求封装：访客令牌 + 统一解包 { code, message, data }
//
// 鉴权说明（重要）：
// 小程序端一律使用「只读访客令牌」，由 POST /api/auth/guest 签发。
// 该令牌只能访问 /api/open/*，而这一组在服务端中间件层强制只允许 GET/HEAD。
// 所以即便小程序包被反编译，最坏也只是读走题库，改不了任何数据。
//
// 早期版本把管理员账号密码写进了小程序端，那是上线前必须拔掉的雷，已移除。
import config from '@/config/index.js'

const TOKEN_KEY = 'guest-token'
let loginPromise = null

function login() {
  return new Promise((resolve, reject) => {
    uni.request({
      url: config.API_BASE + '/auth/guest',
      method: 'POST',
      data: { code: config.GUEST_CODE || '' },
      success: (res) => {
        const body = res.data
        if (body && body.code === 0 && body.data && body.data.token) {
          uni.setStorageSync(TOKEN_KEY, body.data.token)
          resolve()
        } else {
          reject(new Error((body && body.message) || '初始化失败'))
        }
      },
      fail: () => reject(new Error('网络异常，请检查网络后重试'))
    })
  })
}

// 多个请求同时进来时只发一次登录；失败后清空 promise，允许下次重试
function ensureLogin() {
  if (uni.getStorageSync(TOKEN_KEY)) return Promise.resolve()
  if (!loginPromise) {
    loginPromise = login().catch((e) => {
      loginPromise = null
      throw e
    })
  }
  return loginPromise
}

function request({ url, method = 'GET', data }) {
  return ensureLogin().then(
    () =>
      new Promise((resolve, reject) => {
        uni.request({
          url: config.API_BASE + url,
          method,
          data,
          header: {
            'content-type': 'application/json',
            Authorization: 'Bearer ' + (uni.getStorageSync(TOKEN_KEY) || '')
          },
          success: (res) => {
            const body = res.data
            // 令牌失效：清掉重签一次，只重试一次，避免死循环
            if (res.statusCode === 401) {
              uni.removeStorageSync(TOKEN_KEY)
              loginPromise = null
              return ensureLogin()
                .then(() => request({ url, method, data }))
                .then(resolve, reject)
            }
            if (body && body.code === 0) return resolve(body.data)
            reject(new Error((body && body.message) || '请求失败'))
          },
          fail: (err) => {
            reject(
              new Error((err && err.errMsg && /timeout/.test(err.errMsg) ? '请求超时' : '网络异常'))
            )
          }
        })
      })
  )
}

export default {
  get: (url, data) => request({ url, method: 'GET', data }),
  post: (url, data) => request({ url, method: 'POST', data }),
  // 供「重新加载」时强制换一张令牌
  resetToken() {
    uni.removeStorageSync(TOKEN_KEY)
    loginPromise = null
  }
}
