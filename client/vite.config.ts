import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// mermaid 只在「插入图表」对话框里通过 import('mermaid') 动态加载。
// 如果被下面的兜底规则并进 vendor（静态 chunk，首屏就会预加载），会白白多下载好几 MB，
// 所以对 mermaid 及其「只被 mermaid 用到」的依赖返回 undefined，交给 Rollup 自动分包：
// 既保持懒加载，也保留 mermaid 内部按图类型的二次分包（按需只下流程图那一份）。
// 注：mermaid 升级若新增依赖而这里没列上，最坏情况是该依赖并进 vendor，只影响体积、不影响功能。
const MERMAID_ONLY_RE =
  /\/node_modules\/(?:mermaid|@mermaid-js|@braintree|@iconify|@upsetjs|cytoscape[a-z0-9-]*|d3[a-z0-9-]*|dagre[a-z0-9-]*|khroma|marked[a-z0-9-]*|roughjs|stylis|ts-dedent|uuid|fastdom|es-toolkit|langium|chevrotain|cose-base|layout-base|hachure-fill|path-data-parser|points-on-curve|points-on-path|delaunator|internmap|robust-predicates)\//

// 构建产物分包策略：把体积大、变动少的第三方库拆成独立 chunk，
// 既减小首屏 JS，又利用浏览器缓存（业务代码更新不会使 vendor 缓存失效）。
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  if (MERMAID_ONLY_RE.test(id.replace(/\\/g, '/'))) return undefined
  if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
  if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('@tiptap/pm'))
    return 'tiptap'
  if (id.includes('element-plus') || id.includes('@element-plus/icons-vue')) return 'element-plus'
  if (id.includes('katex')) return 'katex'
  if (id.includes('vue') || id.includes('@vue/') || id.includes('vue-router')) return 'vue'
  if (id.includes('axios')) return 'axios'
  return 'vendor'
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      // 前端 /api 请求代理到后端
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4300',
        changeOrigin: true
      }
    }
  },
  // 依赖预构建：显式列出大型依赖，缩短冷启动与 HMR 时的请求数量
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'axios',
      'element-plus',
      '@element-plus/icons-vue',
      'echarts/core',
      'echarts/charts',
      'echarts/components',
      'echarts/renderers',
      '@tiptap/vue-3',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-mathematics',
      'katex',
      'katex/contrib/auto-render'
    ]
  },
  build: {
    target: 'es2019',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true, // 各路由/组件 CSS 按需分包，避免单文件过大
    reportCompressedSize: false, // 构建时不计算 gzip 大小，加快构建
    chunkSizeWarningLimit: 1500, // 调高体积告警阈值，避免大 vendor 误报
    rollupOptions: {
      output: {
        manualChunks,
        // 资源文件名带 hash，便于长期缓存
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
