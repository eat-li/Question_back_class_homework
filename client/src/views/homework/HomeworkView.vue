<template>
  <el-card>
    <div class="toolbar">
      <span class="toolbar-title">已发布作业</span>
      <span class="toolbar-count">共 {{ list.length }} 份</span>
      <el-button size="small" @click="load">刷新</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="title" label="作业标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="题目数" width="90">
        <template #default="{ row }">{{ (row.questionIds || []).length }}</template>
      </el-table-column>
      <el-table-column label="截止时间" width="180">
        <template #default="{ row }">
          <span :class="{ 'end-at--expired': isExpired(row.endAt) }">{{
            formatDateTime(row.endAt)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openView(row)">查看作业</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="还没有已发布的作业" />
  </el-card>

  <!-- 查看作业内容（学生视角，不显示答案） -->
  <el-drawer v-model="viewVisible" title="查看作业" size="60%">
    <div v-loading="detailLoading" class="hw-view">
      <div v-if="detailError" class="hw-error">
        <p class="hw-error__text">作业加载失败，请检查网络后重试。</p>
        <el-button size="small" type="primary" @click="loadDetail">重试</el-button>
      </div>
      <template v-else-if="current">
        <div class="hw-view__head">
          <h2 class="hw-view__title">{{ current.title }}</h2>
          <div class="hw-view__meta">
            <span>共 {{ questions.length }} 题</span>
            <span>截止 {{ formatDateTime(current.endAt) }}</span>
          </div>
        </div>

        <div v-for="(q, i) in questions" :key="q.id" class="hw-q">
          <div class="hw-q__no">
            <span>{{ i + 1 }}.</span>
            <el-tag size="small" type="info">{{ typeLabel(q.type) }}</el-tag>
            <el-tag v-if="q.knowledgeTag" size="small" type="warning" class="hw-q__tag">{{
              q.knowledgeTag
            }}{{ q.knowledgeSubTag ? ' › ' + q.knowledgeSubTag : '' }}</el-tag>
          </div>
          <div class="hw-q__title"><RichContent :html="q.title" /></div>
          <div v-if="q.options && q.options.length" class="hw-q__opts">
            <div v-for="(opt, j) in q.options" :key="j" class="hw-q__opt">
              {{ String.fromCharCode(65 + j) }}.
              {{ typeof opt === 'string' ? opt : JSON.stringify(opt) }}
            </div>
          </div>
          <div v-if="q.body" class="hw-q__body"><RichContent :html="q.body" /></div>
        </div>

        <el-empty v-if="!detailLoading && !questions.length" description="该作业没有题目" />
      </template>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHomeworks, getHomeworkQuestions } from '../../api/homework'
import RichContent from '../../components/RichContent.vue'
import { questionTypeLabel as typeLabel, formatDateTime } from '../../utils/format'
import type { Homework, Question } from '../../types'

const list = ref<Homework[]>([])
const loading = ref(false)
const viewVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref(false)
const current = ref<Homework | null>(null)
const questions = ref<Question[]>([])

// 截止时间是否已过
const isExpired = (d: any) => {
  if (!d) return false
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

// 仅加载已发布的作业
const load = async () => {
  loading.value = true
  try {
    const all = await getHomeworks({ status: 'published' })
    list.value = all
  } finally {
    loading.value = false
  }
}

const openView = async (row: any) => {
  current.value = row
  questions.value = []
  detailError.value = false
  viewVisible.value = true
  await loadDetail()
}

// 加载当前作业题目（独立成函数以便失败后重试）
const loadDetail = async () => {
  if (!current.value) return
  detailLoading.value = true
  detailError.value = false
  try {
    questions.value = await getHomeworkQuestions(current.value.id)
  } catch (e) {
    detailError.value = true // 区分「加载失败」与「该作业没有题目」
  } finally {
    detailLoading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.toolbar-count {
  color: var(--ink-soft);
  font-size: 13px;
}
.end-at--expired {
  color: #f56c6c;
  font-weight: 600;
}

.hw-error {
  padding: 48px 0;
  text-align: center;
}
.hw-error__text {
  margin: 0 0 12px;
  color: #9ca3af;
  font-size: 14px;
}

.hw-view__head {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--line);
}
.hw-view__title {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--ink);
}
.hw-view__meta {
  display: flex;
  gap: 16px;
  color: var(--ink-soft);
  font-size: 13px;
}
.hw-q {
  padding: 14px 0;
  border-bottom: 1px dashed var(--line);
}
.hw-q__no {
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 6px;
}
.hw-q__tag {
  margin-left: 6px;
}
.hw-q__title {
  margin: 4px 0;
}
.hw-q__opts {
  margin: 8px 0 0 22px;
}
.hw-q__opt {
  margin: 2px 0;
  color: #555;
}
.hw-q__body {
  margin-top: 8px;
  color: #555;
}
</style>
