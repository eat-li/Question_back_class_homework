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
        <el-button :icon="Download" @click="exportVisible = true">导出 PDF</el-button>
        <span class="count">共 {{ total }} 题</span>
      </div>
    </el-card>

    <!-- 题目卡片列表 -->
    <div v-loading="loading" class="q-list">
      <el-empty v-if="!loading && !list.length" description="没有符合条件的题目" />

      <QuestionCard
        v-for="(q, idx) in list"
        :key="q.id"
        :question="q"
        :no="(page - 1) * pageSize + idx + 1"
        @generated="(html: string) => (q.answer = html)"
      />
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

    <!-- 导出当前筛选结果为 PDF -->
    <QuestionExportDialog
      v-model="exportVisible"
      :scope="exportScope"
      :scope-label="exportLabel"
      allow-group
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, RefreshLeft, Download } from '@element-plus/icons-vue'
import { getQuestions, getQuestionTags, getQuestionSubTags } from '../../api/question'
import type { QuestionQuery } from '../../api/question'
import QuestionCard from '../../components/QuestionCard.vue'
import QuestionExportDialog from '../../components/QuestionExportDialog.vue'
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

// 当前筛选条件：列表查询与 PDF 导出共用同一份，避免两处逻辑走样
const currentFilters = (): QuestionQuery => {
  const params: QuestionQuery = {}
  if (keyword.value) params.keyword = keyword.value
  if (type.value) params.type = type.value
  if (difficulty.value) params.difficulty = Number(difficulty.value)
  if (knowledgeTag.value) params.knowledgeTag = knowledgeTag.value
  if (subTag.value) params.knowledgeSubTag = subTag.value
  return params
}

const load = async () => {
  loading.value = true
  try {
    const res = await getQuestions({ ...currentFilters(), page: page.value, pageSize })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

// —— 导出 PDF（当前筛选结果）——
const exportVisible = ref(false)
const exportScope = computed(() => currentFilters())
const exportLabel = computed(() => {
  const f = exportScope.value
  const parts: string[] = []
  if (f.knowledgeTag)
    parts.push(f.knowledgeSubTag ? `${f.knowledgeTag} › ${f.knowledgeSubTag}` : f.knowledgeTag)
  if (f.type) parts.push(typeMap[f.type] || f.type)
  if (f.difficulty) parts.push(`难度 ${f.difficulty} 星`)
  if (f.keyword) parts.push(`含「${f.keyword}」`)
  return parts.length ? parts.join(' · ') : '全部题目'
})

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

/* 题目卡片的本体样式已抽到 components/QuestionCard.vue，这里只管列表间距 */
.q-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

.pager {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}
</style>