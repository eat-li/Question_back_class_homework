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
      <el-dropdown trigger="click" @command="onTableCommand">
        <button type="button" class="re-table-btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="1" />
            <line x1="3" x2="21" y1="9" y2="9" />
            <line x1="3" x2="21" y1="15" y2="15" />
            <line x1="9" x2="9" y1="3" y2="21" />
            <line x1="15" x2="15" y1="3" y2="21" />
          </svg>
          <span class="re-table-caret">▾</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="markdown">粘贴 Markdown 表格</el-dropdown-item>
            <el-dropdown-item command="blank">插入空表格 3×3</el-dropdown-item>
            <el-dropdown-item v-if="inTable" command="rowAfter" divided
              >下方插入行</el-dropdown-item
            >
            <el-dropdown-item v-if="inTable" command="rowBefore">上方插入行</el-dropdown-item>
            <el-dropdown-item v-if="inTable" command="colAfter">右侧插入列</el-dropdown-item>
            <el-dropdown-item v-if="inTable" command="colBefore">左侧插入列</el-dropdown-item>
            <el-dropdown-item v-if="inTable" command="deleteRow" divided
              >删除当前行</el-dropdown-item
            >
            <el-dropdown-item v-if="inTable" command="deleteCol">删除当前列</el-dropdown-item>
            <el-dropdown-item v-if="inTable" command="deleteTable" divided
              >删除表格</el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-dropdown trigger="click" @command="onAiCommand">
        <button type="button" class="re-table-btn" :disabled="aiLoading">
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
          <span class="re-table-caret">▾</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="local">本地修复公式（立即，无需联网）</el-dropdown-item>
            <el-dropdown-item command="ai" divided>AI 智能排版（联网，可能较慢）</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
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

    <!-- AI 排版 / 公式修复 预览对话框 -->
    <el-dialog
      v-model="aiDialog.visible"
      :title="aiDialog.title"
      width="860px"
      top="5vh"
      append-to-body
      destroy-on-close
    >
      <el-alert
        v-if="aiDialog.issueText"
        :title="aiDialog.issueText"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <div class="ai-preview-layout">
        <div class="ai-preview-pane">
          <div class="ai-preview-head">原文</div>
          <div class="ai-preview-body" v-html="aiDialog.originalHtml"></div>
        </div>
        <div class="ai-preview-pane">
          <div class="ai-preview-head">排版结果</div>
          <div class="ai-preview-body" v-html="aiDialog.resultHtml"></div>
        </div>
      </div>
      <template #footer>
        <el-button @click="aiDialog.visible = false">取消</el-button>
        <el-button v-if="aiDialog.canRetry" :loading="aiLoading" @click="retryAiFormat"
          >重新排版</el-button
        >
        <el-button type="primary" :loading="aiApplying" @click="applyAiResult">替换内容</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Mathematics } from './math-extension'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { uploadImage } from '../api/upload'
import { getAiConfig, formatQuestion } from '../api/ai'
import { loadAiConfig } from '../utils/aiConfig'
import { sanitizeRichHtml } from '../utils/sanitizeHtml'
import { markdownTableToHtml } from '../utils/markdownTable'
import {
  normalizeMathDelimiters,
  textToParagraphsHtml,
  renderMathInHtml
} from '../utils/mathRender'
import { normalizeAiMathHtml, validateAiMath } from '../utils/aiMath'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const fileInput = ref<HTMLInputElement>()

/* ===================== AI 排版 / 本地公式修复 ===================== */
const router = useRouter()
const aiLoading = ref(false)
const aiApplying = ref(false)

// 排版结果预览对话框
const aiDialog = reactive({
  visible: false,
  title: '',
  originalHtml: '',
  resultHtml: '',
  rawHtml: '', // 原始（未渲染）结果 HTML，用于「替换内容」
  issueText: '',
  canRetry: false,
  resultSource: '' // 本次结果来源，用于重试时区分 'ai' / 'local'
})

const onAiCommand = (cmd: string) => {
  if (cmd === 'local') runLocalMathFix()
  else if (cmd === 'ai') runAiFormat()
}

// 预览渲染：消毒 + 公式渲染
const renderPreviewHtml = (html: string) => renderMathInHtml(sanitizeRichHtml(html || ''))

// 打开预览对话框（original 为当前编辑器内容，result 为处理结果）
const openAiPreview = (title: string, resultHtml: string, canRetry: boolean) => {
  aiDialog.title = title
  aiDialog.originalHtml = renderPreviewHtml(editor.value?.getHTML() || '')
  aiDialog.rawHtml = resultHtml
  aiDialog.resultHtml = renderPreviewHtml(resultHtml)
  aiDialog.canRetry = canRetry
  aiDialog.issueText = ''
  const v = validateAiMath(resultHtml)
  if (v.total && v.failed.length) {
    aiDialog.issueText =
      `共 ${v.total} 处公式，其中 ${v.failed.length} 处未能渲染（预览中以红色标注）：` +
      v.failed
        .slice(0, 3)
        .map((f) => f.content)
        .join(' ｜ ')
  } else if (v.total === 0) {
    aiDialog.issueText = '未检测到 $ 公式（若原题有公式，请检查是否被 AI 遗漏）'
  }
  aiDialog.visible = true
}

// 本地公式修复：不联网，立即对当前内容做 Unicode→LaTeX / 定界符归一化
const runLocalMathFix = () => {
  const current = editor.value?.getHTML() || ''
  const { html, changed } = normalizeAiMathHtml(current)
  if (!changed) {
    ElMessage.info('未发现需要修复的公式（如 ² √ ∑ 等 Unicode 符号或错乱定界符）')
    return
  }
  aiDialog.resultSource = 'local'
  openAiPreview('公式修复预览', html, false)
}

// AI 智能排版：调用后端大模型，返回结果先规范化再预览
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

  await requestAiFormat(payload)
}

// 发起 AI 请求（含超时提示与进度反馈）；失败返回 false
const requestAiFormat = async (payload: any): Promise<boolean> => {
  aiLoading.value = true
  const loading = ElLoading.service({
    text: 'AI 排版中（可能需要 1-2 分钟）…',
    background: 'rgba(0,0,0,0.3)'
  })
  const t0 = Date.now()
  const timer = setInterval(() => {
    loading.setText(`AI 排版中… ${Math.round((Date.now() - t0) / 1000)}s`)
  }, 1000)
  try {
    const { html } = await formatQuestion(payload)
    // 先做本地规范化（Unicode 符号 / 定界符），再预览
    const { html: normalized } = normalizeAiMathHtml(html || '')
    const safe = sanitizeRichHtml(normalized)
    if (!safe.trim()) {
      ElMessage.warning('AI 未返回有效内容')
      return false
    }
    aiDialog.resultSource = 'ai'
    openAiPreview('AI 排版预览', safe, true)
    return true
  } catch (e: any) {
    // 超时/网络/接口错误已由 request.ts 统一提示；这里补充引导
    const isTimeout = e?.code === 'ECONNABORTED' || /超时/.test(e?.message || '')
    ElMessageBox.alert(
      isTimeout
        ? 'AI 接口响应较慢或暂时不可用。可稍后重试，或改用「本地修复公式」（立即生效，无需联网）。'
        : '排版失败，可稍后重试，或改用「本地修复公式」。',
      isTimeout ? 'AI 排版超时' : 'AI 排版失败',
      { confirmButtonText: '知道了', type: isTimeout ? 'warning' : 'error' }
    ).catch(() => {})
    return false
  } finally {
    clearInterval(timer)
    loading.close()
    aiLoading.value = false
  }
}

// 重试：按来源再次执行
const retryAiFormat = () => {
  aiDialog.visible = false
  if (aiDialog.resultSource === 'ai') runAiFormat()
  else runLocalMathFix()
}

// 应用结果：用原始 HTML 替换编辑器内容（编辑器内部再按数学扩展渲染）
const applyAiResult = () => {
  aiApplying.value = true
  try {
    editor.value?.commands.setContent(sanitizeRichHtml(aiDialog.rawHtml), false)
    // ⚠️ setContent 默认 emitUpdate=false，不会触发 onUpdate → v-model 不更新，
    // 保存时会提交排版前的内容。必须手动把新内容同步给父组件（form.title）。
    emit('update:modelValue', editor.value?.getHTML() || '')
    ElMessage.success('已应用排版结果')
    aiDialog.visible = false
  } finally {
    aiApplying.value = false
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
  extensions: [
    StarterKit,
    ResizableImage,
    Mathematics,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell
  ],
  editorProps: {
    // 处理粘贴：图片上传 OSS；Markdown 表格自动转换为 HTML 表格
    handlePaste: (_view, event) => {
      const items = event.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              uploadAndInsert(file)
              return true
            }
          }
        }
      }
      const text = event.clipboardData?.getData('text/plain')
      if (text) {
        const tableHtml = markdownTableToHtml(text)
        if (tableHtml) {
          insertMarkdownTable?.(tableHtml)
          return true
        }
        // 归一化数学定界符（$$ 包裹 $ 的错误嵌套 / 多行公式压成单行）
        const normalized = normalizeMathDelimiters(text)
        if (normalized !== text) {
          insertNormalizedPaste?.(normalized)
          return true
        }
      }
      return false
    }
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  }
})

// 供 handlePaste 在编辑器创建后调用（插入 Markdown 表格）
let insertMarkdownTable: ((html: string) => void) | null = null
insertMarkdownTable = (html) => {
  editor.value?.chain().focus().insertContent(html).run()
}

// 供 handlePaste 插入归一化后的粘贴文本（按 HTML 解析，保留段落/换行）
let insertNormalizedPaste: ((text: string) => void) | null = null
insertNormalizedPaste = (text) => {
  editor.value?.chain().focus().insertContent(textToParagraphsHtml(text)).run()
}

// —— 表格：光标是否位于表格内（用于显示行/列操作项）——
const inTable = ref(false)
const updateTableState = () => {
  inTable.value = !!editor.value?.isActive('table')
}
editor.value?.on('selectionUpdate', updateTableState)
editor.value?.on('transaction', updateTableState)

// 表格工具栏命令
const onTableCommand = (cmd: string) => {
  const chain = editor.value?.chain().focus()
  switch (cmd) {
    case 'markdown':
      insertTableByMarkdown()
      break
    case 'blank':
      chain?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
    case 'rowAfter':
      chain?.addRowAfter().run()
      break
    case 'rowBefore':
      chain?.addRowBefore().run()
      break
    case 'colAfter':
      chain?.addColumnAfter().run()
      break
    case 'colBefore':
      chain?.addColumnBefore().run()
      break
    case 'deleteRow':
      chain?.deleteRow().run()
      break
    case 'deleteCol':
      chain?.deleteColumn().run()
      break
    case 'deleteTable':
      chain?.deleteTable().run()
      break
  }
}

// 弹窗粘贴 Markdown 表格 → 转换为 HTML 表格插入
const insertTableByMarkdown = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '粘贴 Markdown 表格（GitHub 风格）：\n\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| a | b | c |',
      '插入表格',
      {
        inputType: 'textarea',
        inputAutosize: { minRows: 5, maxRows: 12 },
        confirmButtonText: '插入',
        cancelButtonText: '取消'
      }
    )
    const html = markdownTableToHtml(value || '')
    if (!html) {
      ElMessage.warning('未识别到 Markdown 表格，请检查格式（需包含表头与分隔行）')
      return
    }
    editor.value?.chain().focus().insertContent(html).run()
  } catch {
    /* 用户取消 */
  }
}

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
  background: var(--paper);
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
  background: rgba(255, 255, 255, 0.76);
}
.rich-editor.re-fullscreen .re-content :deep(.ProseMirror) {
  min-height: calc(100vh - 140px);
}
.re-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px;
  border-bottom: 1px solid var(--hair);
  background: rgba(255, 255, 255, 0.5);
}
.re-toolbar button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--ink-regular);
  padding: 0;
  transition:
    background-color var(--dur) var(--ease),
    border-color var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.re-toolbar button svg {
  width: 16px;
  height: 16px;
}
.re-toolbar button:hover {
  background: rgba(255, 255, 255, 0.85);
}
.re-toolbar button.active {
  background: var(--moss-soft);
  border-color: rgba(150, 104, 26, 0.32);
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
/* —— 表格 —— */
.re-content :deep(.tableWrapper) {
  overflow-x: auto;
  margin: 8px 0;
}
.re-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  min-width: 320px;
}
.re-content :deep(th),
.re-content :deep(td) {
  border: 1px solid var(--line);
  padding: 6px 10px;
  vertical-align: top;
  text-align: left;
}
.re-content :deep(th) {
  background: rgba(255, 255, 255, 0.55);
  font-weight: 600;
}
.re-content :deep(.selectedCell) {
  background: var(--moss-soft);
}
.re-content :deep(.column-resize-handle) {
  background: var(--moss);
  width: 2px;
}
.re-table-btn {
  width: auto !important;
  padding: 0 6px !important;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.re-table-caret {
  font-size: 10px;
  line-height: 1;
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
  background: rgba(24, 30, 36, 0.82);
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

/* —— AI 排版 / 公式修复 预览对话框 —— */
.ai-preview-layout {
  display: flex;
  gap: 14px;
  height: 52vh;
}
.ai-preview-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.ai-preview-head {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.55);
  border-bottom: 1px solid var(--hair);
}
.ai-preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink);
  word-break: break-word;
  background: rgba(255, 255, 255, 0.76);
}
.ai-preview-body p {
  margin: 0 0 4px;
}
.ai-preview-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 6px 0;
}
.ai-preview-body th,
.ai-preview-body td {
  border: 1px solid var(--line);
  padding: 5px 9px;
}
.ai-preview-body th {
  background: rgba(255, 255, 255, 0.55);
  font-weight: 600;
}
.ai-preview-body img {
  max-width: 100%;
}
</style>
