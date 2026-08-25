<template>
  <div class="rich-editor" :class="{ 're-fullscreen': isFullscreen }">
    <div v-if="editor" class="re-toolbar">
      <el-tooltip content="加粗" placement="top" :show-after="400">
        <button
          type="button"
          :class="{ active: editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="斜体" placement="top" :show-after="400">
        <button
          type="button"
          :class="{ active: editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="19" x2="10" y1="4" y2="4" />
            <line x1="14" x2="5" y1="20" y2="20" />
            <line x1="15" x2="9" y1="4" y2="20" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="删除线" placement="top" :show-after="400">
        <button
          type="button"
          :class="{ active: editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 4H9a3 3 0 0 0-2.83 4" />
            <path d="M14 12a4 4 0 0 1 0 8H6" />
            <line x1="4" x2="20" y1="12" y2="12" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="无序列表" placement="top" :show-after="400">
        <button
          type="button"
          :class="{ active: editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="8" x2="21" y1="6" y2="6" />
            <line x1="8" x2="21" y1="12" y2="12" />
            <line x1="8" x2="21" y1="18" y2="18" />
            <line x1="3" x2="3.01" y1="6" y2="6" />
            <line x1="3" x2="3.01" y1="12" y2="12" />
            <line x1="3" x2="3.01" y1="18" y2="18" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="有序列表" placement="top" :show-after="400">
        <button
          type="button"
          :class="{ active: editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="10" x2="21" y1="6" y2="6" />
            <line x1="10" x2="21" y1="12" y2="12" />
            <line x1="10" x2="21" y1="18" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="插入图片" placement="top" :show-after="400">
        <button type="button" @click="pickImage">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="插入数学公式" placement="top" :show-after="400">
        <button type="button" @click="insertMath">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 7V4H6l6 8-6 8h12v-3" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="AI 排版" placement="top" :show-after="400">
        <button type="button" :disabled="aiLoading" @click="runAiFormat">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9.9 2.6l1.8 4.7 4.7 1.8-4.7 1.8-1.8 4.7-1.8-4.7-4.7-1.8 4.7-1.8z" />
            <path d="M18 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="撤销" placement="top" :show-after="400">
        <button type="button" @click="editor.chain().focus().undo().run()">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip content="重做" placement="top" :show-after="400">
        <button type="button" @click="editor.chain().focus().redo().run()">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </el-tooltip>
      <el-tooltip
        :content="isFullscreen ? '退出全屏 (Esc)' : '全屏'"
        placement="top"
        :show-after="400"
      >
        <button type="button" :class="{ active: isFullscreen }" @click="toggleFullscreen">
          <svg
            v-if="!isFullscreen"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
      </el-tooltip>
    </div>

    <editor-content :editor="editor" class="re-content" @click="onContentClick" />
    <input ref="fileInput" type="file" accept="image/*" class="re-hidden" @change="onFileChange" />

    <!-- 图片全屏预览 / 调整大小 -->
    <teleport to="body">
      <div v-if="preview.visible" class="img-preview" @click.self="closePreview">
        <div class="img-preview-panel">
          <img :src="preview.src" alt="" :style="previewImgStyle" />
          <div class="img-preview-tools">
            <el-button-group>
              <el-button size="small" @click="zoom(-40)">缩小</el-button>
              <el-button size="small" @click="zoom(40)">放大</el-button>
            </el-button-group>
            <span class="img-preview-size">{{
              preview.width > 0 ? preview.width + ' px' : '自适应'
            }}</span>
            <el-button size="small" @click="fitScreen">适应屏幕</el-button>
            <el-button size="small" @click="resetWidth">还原</el-button>
            <el-button size="small" type="primary" @click="closePreview">关闭</el-button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Mathematics } from './math-extension'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { uploadImage } from '../api/upload'
import { getAiConfig, formatQuestion } from '../api/ai'
import { loadAiConfig } from '../utils/aiConfig'
import { sanitizeHtml } from '../utils/sanitizeHtml'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const fileInput = ref<HTMLInputElement>()

/* ===================== AI 智能排版 ===================== */
const router = useRouter()
const aiLoading = ref(false)

const runAiFormat = async () => {
  const text = editor.value?.getText().trim()
  if (!text) {
    ElMessage.warning('请先在编辑器中粘贴题目内容')
    return
  }

  const cfg = loadAiConfig()
  let payload: any = { text }

  if (cfg.apiKey) {
    // 前端本地配置优先
    payload = { ...payload, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model }
  } else {
    // 本地没配 Key 时，看后端 .env 是否已配置
    try {
      const backend = await getAiConfig()
      if (!backend.hasBackendKey) {
        await ElMessageBox.confirm('尚未配置 AI API Key，是否前往「系统设置」进行配置？', '提示', {
          confirmButtonText: '去设置',
          cancelButtonText: '取消',
          type: 'warning'
        })
        router.push('/settings')
        return
      }
      payload = { ...payload, apiKey: '', baseUrl: backend.baseUrl, model: backend.model }
    } catch {
      // 获取后端配置失败时已由 request.ts 统一提示
      return
    }
  }

  aiLoading.value = true
  const loading = ElLoading.service({ text: 'AI 排版中，请稍候…', background: 'rgba(0,0,0,0.3)' })
  try {
    const { html } = await formatQuestion(payload)
    const safeHtml = sanitizeHtml(html || '')
    editor.value?.commands.setContent(safeHtml, false)
    ElMessage.success('排版完成')
  } catch (e: any) {
    // 错误提示已由 request.ts 全局拦截器统一弹出
    console.error('AI 排版失败', e)
  } finally {
    loading.close()
    aiLoading.value = false
  }
}

// 全屏编辑模式
const isFullscreen = ref(false)
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  document.body.style.overflow = isFullscreen.value ? 'hidden' : ''
  nextTick(() => editor.value?.commands.focus())
}

// 图片节点增加 width 属性，用于调整大小
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null }
    }
  }
})

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [StarterKit, ResizableImage, Mathematics],
  editorProps: {
    // 处理粘贴图片（Ctrl+V 截图）：上传到 OSS 后插入
    handlePaste: (_view, event) => {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            uploadAndInsert(file)
            return true
          }
        }
      }
      return false
    }
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  }
})

// 外部回显（编辑已有题目时把 HTML 塞回编辑器）
watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '', false)
    }
  }
)

// 上传图片文件到 OSS，成功后插入编辑器
async function uploadAndInsert(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 10MB')
    return
  }
  const loading = ElLoading.service({ text: '图片上传中…', background: 'rgba(0,0,0,0.3)' })
  try {
    const { url } = await uploadImage(file)
    editor.value?.chain().focus().setImage({ src: url }).run()
  } catch (e: any) {
    // 错误提示已由 request.ts 全局拦截器统一弹出
    console.error('图片上传失败', e)
  } finally {
    loading.close()
  }
}

const pickImage = () => fileInput.value?.click()

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await uploadAndInsert(file)
  input.value = ''
}

// 弹窗输入 LaTeX 后插入 $...$ 公式
const insertMath = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '输入 LaTeX 公式（例如 x^2 + y^2 = z^2）',
      '插入公式',
      {
        confirmButtonText: '插入',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '请输入公式内容'
      }
    )
    editor.value?.chain().focus().insertContent(`$${value}$`).run()
  } catch {
    /* 用户取消 */
  }
}

/* ===================== 图片预览 / 调整大小 ===================== */
const preview = reactive({
  visible: false,
  src: '',
  pos: 0, // 图片节点在文档中的位置
  width: 0, // 文档图片宽度(px)，0 表示自适应
  natural: 400, // 图片自然宽度
  fitScreen: true // 是否适应屏幕显示
})

const previewImgStyle = computed(() => {
  if (preview.fitScreen || preview.width <= 0) {
    return { width: 'auto', height: 'auto', maxWidth: '88vw', maxHeight: '78vh' }
  }
  return {
    width: preview.width + 'px',
    maxWidth: '88vw',
    maxHeight: '78vh',
    objectFit: 'contain' as const
  }
})

// 点击编辑器中的图片 → 打开预览
const onContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName !== 'IMG') return
  const view = editor.value?.view
  if (!view) return
  const pos = view.posAtDOM(target, 0)
  const node = editor.value?.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'image') return

  const img = target as HTMLImageElement
  preview.src = img.getAttribute('src') || ''
  preview.pos = pos
  preview.natural = img.naturalWidth || img.clientWidth || 400
  const w = node.attrs.width ? parseInt(node.attrs.width, 10) : 0
  preview.width = isNaN(w) ? 0 : w
  preview.fitScreen = true
  preview.visible = true
}

// 把宽度写回文档中的图片节点
const applyWidth = (w: number | null) => {
  editor.value
    ?.chain()
    .focus()
    .setNodeSelection(preview.pos)
    .updateAttributes('image', { width: w == null ? null : String(w) })
    .run()
}

const zoom = (delta: number) => {
  if (preview.width <= 0) preview.width = preview.natural
  preview.width = Math.max(60, Math.min(1600, preview.width + delta))
  preview.fitScreen = false
  applyWidth(preview.width)
}

const fitScreen = () => {
  preview.fitScreen = true
}

const resetWidth = () => {
  preview.width = 0
  preview.fitScreen = false
  applyWidth(null)
}

const closePreview = () => {
  preview.visible = false
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (preview.visible) closePreview()
  else if (isFullscreen.value) toggleFullscreen()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.rich-editor {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
/* —— 全屏编辑模式 —— */
.rich-editor.re-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 3000;
  border: none;
  border-radius: 0;
  background: #fffdf9;
  display: flex;
  flex-direction: column;
}
.rich-editor.re-fullscreen .re-toolbar {
  flex-wrap: nowrap;
  overflow-x: auto;
}
.rich-editor.re-fullscreen .re-content {
  flex: 1;
  max-height: none;
  overflow-y: auto;
  padding: 16px 20px;
}
.rich-editor.re-fullscreen .re-content :deep(.ProseMirror) {
  min-height: calc(100vh - 140px);
}
.re-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px;
  border-bottom: 1px solid var(--line);
  background: #f6f1e7;
}
.re-toolbar button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #5a544a;
  padding: 0;
}
.re-toolbar button svg {
  width: 16px;
  height: 16px;
}
.re-toolbar button:hover {
  background: #ede5d4;
}
.re-toolbar button.active {
  background: var(--moss-soft);
  border-color: #cfe0d2;
  color: var(--moss-deep);
}
.re-content {
  padding: 8px 12px;
  max-height: 320px;
  overflow-y: auto;
}
.re-content :deep(.ProseMirror) {
  min-height: 100px;
  outline: none;
}
/* 图片默认样式：居中、圆角、防撑破、提示可点击 */
.re-content :deep(.ProseMirror img) {
  max-width: 100%;
  border-radius: 6px;
  display: block;
  margin: 6px auto;
  cursor: zoom-in;
  transition: box-shadow 0.2s ease;
}
.re-content :deep(.ProseMirror img:hover) {
  box-shadow: 0 0 0 2px var(--moss-soft);
}
.re-content :deep(.ProseMirror img.ProseMirror-selectednode) {
  box-shadow: 0 0 0 2px var(--moss);
}
.re-content :deep(.ProseMirror p) {
  margin: 0 0 4px;
}
/* 块级公式（$$...$$）单独成行 */
.re-content :deep(.Tiptap-mathematics-render--display) {
  display: block;
  margin: 6px 0;
  overflow-x: auto;
}
.re-hidden {
  display: none;
}
.re-toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* —— 图片全屏预览弹层 —— */
.img-preview {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(40, 35, 30, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.img-preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 100%;
}
.img-preview-panel img {
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  background: #fff;
}
.img-preview-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(6px);
  padding: 8px 14px;
  border-radius: 999px;
}
.img-preview-size {
  color: #fff;
  font-size: 13px;
  min-width: 56px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
