<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索：学生 / 内容 / 作业标题"
        clearable
        style="width: 260px"
        @keyup.enter="load"
        @clear="load"
      />
      <el-select
        v-model="studentId"
        placeholder="全部学生"
        clearable
        filterable
        style="width: 180px"
        @change="load"
      >
        <el-option
          v-for="s in students"
          :key="s.id"
          :label="`${s.name}${s.grade ? '（' + s.grade + '）' : ''}`"
          :value="s.id"
        />
      </el-select>
      <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
      <span class="count">共 {{ filtered.length }} 条</span>
    </div>

    <el-table :data="filtered" border stripe v-loading="loading">
      <el-table-column label="上课时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.lessonAt) }}</template>
      </el-table-column>
      <el-table-column label="次数" width="80" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">第 {{ row.lessonNo ?? '—' }} 次</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="学生" width="120">
        <template #default="{ row }">{{ row.student?.name || '—' }}</template>
      </el-table-column>
      <el-table-column label="所属作业" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.homework?.title || '—' }}</template>
      </el-table-column>
      <el-table-column label="上课内容" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.content || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" :icon="EditPen" @click="openEditor(row)"
            >编辑 / 导出</el-button
          >
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !list.length" description="还没有课时总结，可在「作业管理」中按作业生成" />

    <!-- 复用作业列表同一套编辑器（含 AI 生成、图片/PDF 导出） -->
    <LessonSummaryDialog
      v-model="editorVisible"
      :homework-id="editingHomeworkId"
      :summary-id="editingSummaryId"
      @saved="load"
    />
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, RefreshLeft, EditPen, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSummaries, deleteSummary } from '../../api/summary'
import { getStudents } from '../../api/student'
import LessonSummaryDialog from '../../components/LessonSummaryDialog.vue'
import { formatDateTime } from '../../utils/format'

const list = ref<any[]>([])
const students = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const studentId = ref<number | undefined>()

const editorVisible = ref(false)
const editingHomeworkId = ref<number | null>(null)
const editingSummaryId = ref<number | null>(null)

// 关键词在前端过滤（单教师数据量小，省一次往返）
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return list.value.filter((row) => {
    if (studentId.value && row.studentId !== studentId.value) return false
    if (!kw) return true
    const hay = [
      row.student?.name,
      row.homework?.title,
      row.content,
      row.classStatus,
      row.homeworkTask
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
})

const load = async () => {
  loading.value = true
  try {
    list.value = (await getSummaries({ studentId: studentId.value })) || []
  } catch {
    // 错误提示已由 request.ts 统一弹出
  } finally {
    loading.value = false
  }
}

const reset = () => {
  keyword.value = ''
  studentId.value = undefined
  load()
}

// 打开编辑器：带上作业 id 与总结 id，组件会自行载入全部上下文
const openEditor = (row: any) => {
  editingHomeworkId.value = row.homeworkId ?? null
  editingSummaryId.value = row.id ?? null
  editorVisible.value = true
}

const remove = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定删除这条课时总结？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteSummary(row.id)
    ElMessage.success('已删除')
    load()
  } catch (err) {
    console.error('删除课时总结失败', err)
  }
}

onMounted(async () => {
  load()
  try {
    students.value = (await getStudents()) as any[]
  } catch {
    /* 学生列表失败不影响主列表 */
  }
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.count {
  color: var(--ink-soft);
  font-size: 13px;
}
</style>
