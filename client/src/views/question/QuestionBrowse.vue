<template>
  <div class="browse">
    <!-- 筛选栏 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-input
          v-model="keyword"
          placeholder="搜索题干 / 补充说明"
          clearable
          style="width: 240px"
          @keyup.enter="search"
        />
        <el-select v-model="type" placeholder="全部题型" clearable style="width: 130px">
          <el-option label="选择题" value="choice" />
          <el-option label="填空题" value="fill" />
          <el-option label="解答题" value="solve" />
        </el-select>
        <el-select v-model="difficulty" placeholder="全部难度" clearable style="width: 130px">
          <el-option v-for="d in 5" :key="d" :label="'★'.repeat(d)" :value="d" />
        </el-select>
        <el-select
          v-model="knowledgeTag"
          placeholder="全部知识点"
          clearable
          filterable
          style="width: 180px"
          @change="onPrimaryTagChange"
        >
          <el-option v-for="t in tags" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select
          v-model="subTag"
          placeholder="全部二级知识点"
          clearable
          filterable
          style="width: 160px"
          :disabled="!knowledgeTag"
        >
          <el-option v-for="t in subTagOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
        <span class="count">共 {{ total }} 题</span>
      </div>
    </el-card>

    <!-- 题目卡片列表 -->
    <div v-loading="loading" class="q-list">
      <el-empty v-if="!loading && !list.length" description="没有符合条件的题目" />

      <div v-for="(q, idx) in list" :key="q.id" class="q-card">
        <div class="q-head">
          <span class="q-no">{{ (page - 1) * pageSize + idx + 1 }}</span>
          <span class="q-type" :class="`type-${q.type}`">{{ typeLabel(q.type) }}</span>
          <span class="q-diff" :title="`难度 ${q.difficulty || 0}/5`">
            {{ '★'.repeat(q.difficulty || 0) || '—' }}
          </span>
          <span v-if="q.knowledgeTag" class="q-tag">{{ q.knowledgeTag }}</span>
          <span v-if="q.knowledgeSubTag" class="q-tag q-tag--sub">{{ q.knowledgeSubTag }}</span>
        </div>

        <div class="q-title" @click="onContentClick"><RichContent :html="q.title || ''" /></div>

        <div v-if="q.body" class="q-body" @click="onContentClick">
          <RichContent :html="q.body" />
        </div>

        <div v-if="q.options && q.options.length" class="q-options">
          <div v-for="(o, j) in q.options" :key="j" class="opt">
            <span class="opt-letter">{{ String.fromCharCode(65 + j) }}.</span>
            <span>{{ typeof o === 'string' ? o : JSON.stringify(o) }}</span>
          </div>
        </div>

        <div class="q-foot">
          <el-button link type="primary" @click="toggleExpand(q.id)">
            {{ expanded.has(q.id) ? '收起答案与解析' : '查看答案与解析' }}
          </el-button>
        </div>

        <div v-if="expanded.has(q.id)" class="q-answer" @click="onContentClick">
          <div class="answer-label">答案与解析</div>
          <RichContent :html="q.answer || ''" />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="load"
      />
    </div>

    <!-- 图片放大预览 -->
    <el-dialog v-model="previewVisible" title="查看原图" width="70%" top="6vh" append-to-body>
      <div class="img-preview">
        <img :src="previewUrl" alt="题目图片" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { getQuestions, getQuestionTags, getQuestionSubTags } from '../../api/question'
import RichContent from '../../components/RichContent.vue'
import type { Question } from '../../types'

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}

const list = ref<Question[]>([])
const loading = ref(false)
const tags = ref<string[]>([])

// 筛选条件
const keyword = ref('')
const type = ref('')
const difficulty = ref<number | ''>('')
const knowledgeTag = ref('')
const subTag = ref('')
const subTagOptions = ref<string[]>([])

// 一级知识点变化：清空二级并刷新二级候选
const onPrimaryTagChange = async () => {
  subTag.value = ''
  subTagOptions.value = []
  if (!knowledgeTag.value) return
  try {
    const subs = await getQuestionSubTags(knowledgeTag.value)
    subTagOptions.value = subs.map((s) => s.name)
  } catch {
    subTagOptions.value = []
  }
}

// 分页
const page = ref(1)
const pageSize = 10
const total = ref(0)

// 答案/解析展开状态
const expanded = ref(new Set<number>())

const typeLabel = (t: string) => typeMap[t] || t

const toggleExpand = (id: number) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

// 图片放大预览
const previewVisible = ref(false)
const previewUrl = ref('')
const onContentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = target.getAttribute('src')
    if (src) {
      previewUrl.value = src
      previewVisible.value = true
    }
  }
}

const load = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize }
    if (keyword.value) params.keyword = keyword.value
    if (type.value) params.type = type.value
    if (difficulty.value) params.difficulty = difficulty.value
    if (knowledgeTag.value) params.knowledgeTag = knowledgeTag.value
    if (subTag.value) params.knowledgeSubTag = subTag.value
    const res = await getQuestions(params)
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

// 查询/重置时回到第一页
const search = () => {
  page.value = 1
  load()
}

const reset = () => {
  keyword.value = ''
  type.value = ''
  difficulty.value = ''
  knowledgeTag.value = ''
  subTag.value = ''
  subTagOptions.value = []
  search()
}

const loadTags = async () => {
  tags.value = await getQuestionTags()
}

onMounted(() => {
  load()
  loadTags()
})
</script>

<style scoped>
.browse {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.filter-card :deep(.el-card__body) {
  padding: 16px 20px;
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.count {
  margin-left: auto;
  color: var(--ink-soft);
  font-size: 13px;
}

.q-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

.q-card {
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  padding: 18px 22px;
  box-shadow: var(--shadow-soft);
  transition: box-shadow 0.25s ease;
  max-height: 70vh;
  overflow-y: auto;
}
.q-card:hover {
  box-shadow: var(--shadow-hover);
}

.q-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.q-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--moss-soft);
  color: var(--moss-deep);
  font-weight: 700;
  font-size: 14px;
}
.q-type {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
}
.type-choice {
  background: var(--moss-soft);
  color: var(--moss-deep);
}
.type-fill {
  background: rgba(125, 117, 102, 0.13);
  color: #5c5648;
}
.type-solve {
  background: rgba(95, 111, 76, 0.13);
  color: #4c593d;
}
.q-diff {
  color: var(--accent);
  font-size: 13px;
  letter-spacing: 1px;
}
.q-tag {
  font-size: 12px;
  color: var(--ink-soft);
  background: var(--paper-deep);
  padding: 2px 10px;
  border-radius: 999px;
}
.q-tag--sub {
  color: var(--moss-deep);
  background: var(--moss-soft);
}

.q-title {
  font-size: 15px;
  color: var(--ink);
  line-height: 1.8;
}
/* 限制卡片内图片大小，避免大图撑满整屏 */
.q-title :deep(img),
.q-body :deep(img),
.q-answer :deep(img) {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
  cursor: zoom-in;
}

.img-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 72vh;
  overflow: auto;
}
.img-preview img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}
.q-body {
  margin-top: 6px;
  font-size: 14px;
}

.q-options {
  margin: 10px 0 0 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.opt {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
}
.opt-letter {
  font-weight: 600;
  color: var(--moss-deep);
  margin-right: 4px;
}

.q-foot {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}

.q-answer {
  margin-top: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-left: 3px solid var(--moss);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.answer-label {
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 6px;
}

.pager {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}
</style>
