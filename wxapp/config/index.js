// 小程序全局配置
//
// 两套环境：
//   dev  —— 本机联调。API_BASE 填电脑在局域网中的 IP，端口 3000。
//           需要 manifest.json 里 mp-weixin.setting.urlCheck = false 才能请求 http。
//   prod —— 提审 / 上线。必须是已备案的 https 域名，并在微信公众平台
//           「开发管理 → 服务器域名」里登记 request 合法域名。
//
// 发版前把 CURRENT 切成 'prod'。

const isProd = false

const ENV = {
  dev: {
    API_BASE: 'http://10.76.151.181:3000/api',
    OSS_BASE: 'https://blog-saki.oss-cn-chengdu.aliyuncs.com',
    // 开发期直接吃后端 public/katex-fonts（后端已为此加了公开静态路由）
    // 注意：IP 会随网络变化，这三处要一起改
    KATEX_FONT_BASE: 'http://10.76.151.181:3000/katex-fonts'
  },
  prod: {
    API_BASE: 'https://your-domain.com/api',
    OSS_BASE: 'https://blog-saki.oss-cn-chengdu.aliyuncs.com',
    // 上线前把 server/public/katex-fonts 下的 9 个 woff2 传到 OSS 的 katex-fonts/ 目录，
    // 并把该 host 加进微信公众平台的 downloadFile 合法域名
    KATEX_FONT_BASE: 'https://blog-saki.oss-cn-chengdu.aliyuncs.com/katex-fonts'
  }
}

const active = ENV[isProd ? 'prod' : 'dev']

// GUEST_CODE：与 server/.env 的 GUEST_CODE 保持一致。
// 服务端未配置时留空即可；服务端配置后，这里必须填相同的值，否则访客登录会失败。
const GUEST_CODE = ''

export default {
  isProd,
  API_BASE: active.API_BASE,
  // 题目富文本里的相对图片地址会补上这个前缀；
  // 若要在小程序里长按保存 / 预览大图，该 host 还需加入 downloadFile 合法域名
  OSS_BASE: active.OSS_BASE,
  GUEST_CODE,
  // KaTeX 字体基址：公式渲染靠 uni.loadFontFace 在启动时预加载
  KATEX_FONT_BASE: active.KATEX_FONT_BASE,
  // 公式渲染方式：
  //   'katex' —— mp-html + katex 插件，真公式排版，与 Web 端一致（当前默认）
  //   'text'  —— 降级成可读文本（utils/latex.js），包体最小、渲染最稳
  // 真机上若公式显示异常，把这里改成 'text' 即可一键回退，不影响其它功能
  MATH_RENDER: 'katex',
  // 列表分页大小。10 条在首屏速度与滚动体验之间比较平衡
  PAGE_SIZE: 10,
  // 知识点 / 标签等低频数据的本地缓存时长
  CACHE_TTL: {
    KNOWLEDGE: 5 * 60 * 1000,
    DETAIL: 60 * 1000
  }
}
