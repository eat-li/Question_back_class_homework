<template>
  <el-card>
    <div class="toolbar">
      <el-button link type="primary" @click="goBack">← 返回题库</el-button>
      <span class="title">{{ tagLabel }}</span>
      <span class="count">共 {{ list.length }} 题</span>
    </div>

    <div class="filters">
      <el-radio-group v-model="type" @change="load">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="choice">选择题</el-radio-button>
        <el-radio-button value="fill">填空题</el-radio-button>
        <el-radio-button value="solve">解答题</el-radio-button>
      </el-radio-group>
      <el-select v-model="difficulty" placeholder="难度" clearable style="width: 120px" @change="load">
        <el-option v-for="n in 5" :key="n" :label="`${n} 星`" :value="n" />
      </el-select>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="题干" show-overflow-tooltip min-width="240">
        <template #default="{ row }">{{ stripHtml(row.title) }}</template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="80" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <QuestionFormDialog v-model="editVisible" :question="editing" @saved="load" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getQuestions, deleteQuestion } from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'

const route = useRoute()
const router = useRouter()

// 知识点标识：路由参数；__empty__ 表示「未分类」
const tag = computed(() => String(route.params.tag || ''))
const tagLabel = computed(() => (tag.value === '__empty__' ? '未分类' : tag.value))

const list = ref<any[]>([])
const loading = ref(false)
const type = ref('all')
const difficulty = ref<number>()
const editVisible = ref(false)
const editing = ref<any>(null)

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}
const typeLabel = (t: string) => typeMap[t] || t

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

const load = async () => {
  loading.value = true
  try {
    const params: any = { knowledgeTag: tag.value }
    if (type.value !== 'all') params.type = type.value
    if (difficulty.value != null) params.difficulty = difficulty.value
    list.value = await getQuestions(params)
  } finally {
    loading.value = false
  }
}

const goBack = () => router.push('/questions')

const openEdit = (row: any) => {
  editing.value = row
  editVisible.value = true
}

const remove = async (row: any) => {
  await ElMessageBox.confirm('确定删除该题目？', '提示', { type: 'warning' })
  await deleteQuestion(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.count {
  color: #909399;
  font-size: 13px;
}
.filters {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
