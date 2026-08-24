import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 构建产物分包策略：把体积大、变动少的第三方库拆成独立 chunk，
// 既减小首屏 JS，又利用浏览器缓存（业务代码更新不会使 vendor 缓存失效）。
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
  if (id.includes('@tiptap') || id.includes('prosemirror') || id.includes('@tiptap/pm')) return 'tiptap'
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
        target: 'http://localhost:3000',
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
