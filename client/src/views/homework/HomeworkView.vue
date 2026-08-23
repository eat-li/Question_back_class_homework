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
          <span :class="{ 'end-at--expired': isExpired(row.endAt) }">{{ formatDateTime(row.endAt) }}</span>
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
      <template v-if="current">
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
            <el-tag v-if="q.knowledgeTag" size="small" type="warning" class="hw-q__tag">{{ q.knowledgeTag }}</el-tag>
          </div>
          <div class="hw-q__title"><RichContent :html="q.title" /></div>
          <div v-if="q.options && q.options.length" class="hw-q__opts">
            <div v-for="(opt, j) in q.options" :key="j" class="hw-q__opt">
              {{ String.fromCharCode(65 + j) }}. {{ typeof opt === 'string' ? opt : JSON.stringify(opt) }}
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

const list = ref<any[]>([])
const loading = ref(false)
const viewVisible = ref(false)
const detailLoading = ref(false)
const current = ref<any>(null)
const questions = ref<any[]>([])

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}
const typeLabel = (t: string) => typeMap[t] || t

// 日期时间格式化：DATE / ISO / 字符串 → YYYY-MM-DD HH:mm
const formatDateTime = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

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
    const all = await getHomeworks()
    list.value = all.filter((h: any) => h.status === 'published')
  } finally {
    loading.value = false
  }
}

const openView = async (row: any) => {
  current.value = row
  questions.value = []
  viewVisible.value = true
  detailLoading.value = true
  try {
    questions.value = await getHomeworkQuestions(row.id)
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
  color: #909399;
  font-size: 13px;
}
.end-at--expired {
  color: #f56c6c;
  font-weight: 600;
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
  color: #909399;
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
