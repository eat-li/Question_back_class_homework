<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增成绩</el-button>
      <el-button type="primary" plain :icon="Upload" @click="openBatch">批量录入</el-button>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="fName"
        placeholder="学生姓名"
        clearable
        style="width: 160px"
        @keyup.enter="load"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="fExamType" placeholder="考试类型" clearable style="width: 140px">
        <el-option v-for="t in examTypes" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-date-picker
        v-model="fExamDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="考试日期"
        style="width: 170px"
      />
      <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      <el-button :icon="RefreshRight" @click="reset">重置</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="学生" width="120">
        <template #default="{ row }">{{ row.student?.name || '—' }}</template>
      </el-table-column>
      <el-table-column label="年级" width="110">
        <template #default="{ row }">{{ row.student?.grade || '—' }}</template>
      </el-table-column>
      <el-table-column label="科目" width="90">
        <template #default="{ row }">{{ row.subject }}</template>
      </el-table-column>
      <el-table-column label="考试类型" width="110">
        <template #default="{ row }">
          <el-tag :type="examTypeTag(row.examType)" size="small">{{ examTypeLabel(row.examType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="考试日期" width="120">
        <template #default="{ row }">{{ row.examDate || '—' }}</template>
      </el-table-column>
      <el-table-column label="得分" width="140">
        <template #default="{ row }">
          <span class="score">{{ row.score }}</span>
          <span class="score-full">/ {{ row.fullScore }}</span>
        </template>
      </el-table-column>
      <el-table-column label="百分比" width="90">
        <template #default="{ row }">
          <span :class="percentClass(row)">{{ percent(row) }}%</span>
        </template>
      </el-table-column>
      <el-table-column prop="comment" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" :description="queried ? '没有符合条件的成绩记录' : '请设置筛选条件后点击「查询」'" />

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑成绩' : '新增成绩'" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" filterable placeholder="选择学生" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="`${s.name}${s.grade ? '（' + s.grade + '）' : ''}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="考试类型">
          <el-select v-model="form.examType" style="width: 100%">
            <el-option v-for="t in examTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="考试日期">
          <el-date-picker v-model="form.examDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="得分">
          <el-input-number v-model="form.score" :min="0" :max="form.fullScore || 1000" :precision="1" style="width: 140px" />
          <span class="inline-tip">/ 满分</span>
          <el-input-number v-model="form.fullScore" :min="1" :precision="1" style="width: 120px; margin-left: 8px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.comment" placeholder="如：进步明显 / 函数仍需加强" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量录入 -->
    <el-dialog v-model="batchVisible" title="批量录入成绩" width="640px">
      <el-form label-width="80px">
        <div class="batch-session">
          <el-form-item label="考试类型">
            <el-select v-model="batchForm.examType" style="width: 150px">
              <el-option v-for="t in examTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="满分">
            <el-input-number v-model="batchForm.fullScore" :min="1" :precision="1" style="width: 120px" />
          </el-form-item>
          <el-form-item label="考试日期">
            <el-date-picker v-model="batchForm.examDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 150px" />
          </el-form-item>
        </div>

        <el-form-item label="选择学生">
          <el-select v-model="batchStudentIds" multiple filterable collapse-tags collapse-tags-tooltip placeholder="多选学生" style="width: 100%">
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table v-if="selectedStudents.length" :data="selectedStudents" border max-height="320">
        <el-table-column prop="name" label="姓名" width="140" />
        <el-table-column label="得分">
          <template #default="{ row }">
            <el-input-number v-model="batchScores[row.id]" :min="0" :max="batchForm.fullScore" :precision="1" size="small" style="width: 160px" />
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="batch-empty">请先选择学生，再为每位学生录入分数</div>

      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedStudents.length" @click="submitBatch">确认录入</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Upload, Search, Edit, Delete, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudents } from '../../api/student'
import { getGrades, createGrade, updateGrade, deleteGrade, importGrades } from '../../api/grade'

const examTypes = [
  { value: 'final', label: '期末' },
  { value: 'mid', label: '期中' },
  { value: 'quiz', label: '小测' },
  { value: 'popquiz', label: '随堂测验' }
]

const examTypeLabel = (t: string) => examTypes.find((x) => x.value === t)?.label || t
const examTypeTag = (t: string): 'success' | 'warning' | 'primary' | 'info' | 'danger' =>
  (({ final: 'success', mid: 'primary', quiz: 'warning', popquiz: 'info' } as Record<string, any>)[t]) || 'info'

const students = ref<any[]>([])
const list = ref<any[]>([])
const loading = ref(false)
const queried = ref(false)
const fName = ref('')
const fExamType = ref('')
const fExamDate = ref('')

const dialogVisible = ref(false)
const form = reactive<any>({ examType: 'quiz', subject: '数学', fullScore: 100 })

const batchVisible = ref(false)
const batchForm = reactive<any>({ examType: 'quiz', subject: '数学', fullScore: 100, examDate: '' })
const batchStudentIds = ref<number[]>([])
const batchScores = reactive<Record<number, number | undefined>>({})

const selectedStudents = computed(() => students.value.filter((s) => batchStudentIds.value.includes(s.id)))

const percent = (row: any) => (row.fullScore > 0 ? Math.round((row.score / row.fullScore) * 100) : 0)
const percentClass = (row: any) => {
  const p = percent(row)
  if (p >= 90) return 'pct pct--good'
  if (p >= 60) return 'pct pct--mid'
  return 'pct pct--bad'
}

const load = async () => {
  if (!fName.value.trim() && !fExamType.value && !fExamDate.value) {
    ElMessage.warning('请至少设置一项筛选条件（姓名 / 考试类型 / 日期）')
    return
  }
  loading.value = true
  try {
    list.value = await getGrades({
      studentName: fName.value.trim() || undefined,
      examType: fExamType.value || undefined,
      examDate: fExamDate.value || undefined
    })
    queried.value = true
  } finally {
    loading.value = false
  }
}

const reset = () => {
  fName.value = ''
  fExamType.value = ''
  fExamDate.value = ''
  list.value = []
  queried.value = false
}

const loadStudents = async () => {
  students.value = await getStudents()
}

const openDialog = (row?: any) => {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) {
    Object.assign(form, {
      id: row.id,
      studentId: row.studentId,
      subject: row.subject,
      examType: row.examType,
      examDate: row.examDate,
      score: row.score,
      fullScore: row.fullScore,
      comment: row.comment
    })
  } else {
    form.examType = 'quiz'
    form.subject = '数学'
    form.fullScore = 100
    form.score = undefined
    form.examDate = ''
  }
  dialogVisible.value = true
}

const save = async () => {
  if (!form.studentId) return ElMessage.warning('请选择学生')
  if (form.score == null || form.score === '') return ElMessage.warning('请输入得分')
  if (!form.examDate) return ElMessage.warning('请选择考试日期')
  if (form.score < 0 || form.score > form.fullScore) return ElMessage.warning('得分需在 0 ~ 满分 之间')

  const payload = { ...form }
  if (form.id) {
    await updateGrade(form.id, payload)
    ElMessage.success('更新成功')
  } else {
    await createGrade(payload)
    ElMessage.success('保存成功')
  }
  dialogVisible.value = false
  load()
}

const openBatch = () => {
  batchForm.examType = 'quiz'
  batchForm.subject = '数学'
  batchForm.fullScore = 100
  batchForm.examDate = ''
  batchStudentIds.value = []
  Object.keys(batchScores).forEach((k) => delete batchScores[k])
  batchVisible.value = true
}

const submitBatch = async () => {
  if (!batchForm.examDate) return ElMessage.warning('请选择考试日期')
  const rows = selectedStudents.value
    .map((s) => ({ studentId: s.id, score: batchScores[s.id] }))
    .filter((r) => r.score != null && r.score !== '')
  if (!rows.length) return ElMessage.warning('请至少为一名学生录入分数')

  const payload = rows.map((r) => ({
    studentId: r.studentId,
    examType: batchForm.examType,
    subject: batchForm.subject,
    fullScore: batchForm.fullScore,
    examDate: batchForm.examDate,
    score: Number(r.score)
  }))
  await importGrades(payload)
  ElMessage.success(`批量录入完成：${rows.length} 名学生`)
  batchVisible.value = false
  load()
}

const remove = async (row: any) => {
  await ElMessageBox.confirm(
    `确定删除「${row.student?.name}」的 ${row.subject}·${examTypeLabel(row.examType)} 成绩（${row.score} 分）？`,
    '提示',
    { type: 'warning' }
  )
  await deleteGrade(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(() => {
  loadStudents()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.score {
  font-weight: 600;
  color: var(--ink);
}
.score-full {
  color: var(--ink-soft);
  font-size: 12px;
}
.pct {
  font-weight: 600;
}
.pct--good {
  color: var(--moss-deep);
}
.pct--mid {
  color: #c2a878;
}
.pct--bad {
  color: #f56c6c;
}
.inline-tip {
  margin: 0 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.batch-session {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
}
.batch-empty {
  padding: 24px 0;
  text-align: center;
  color: var(--ink-soft);
  font-size: 13px;
}
</style>
