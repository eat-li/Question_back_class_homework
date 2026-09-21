<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增成绩</el-button>
      <el-button type="primary" plain :icon="Upload" @click="openBatch">批量录入</el-button>
      <div class="toolbar-spacer"></div>
      <span class="hint">点击学生卡片查看其全部成绩</span>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="fName"
        placeholder="搜索学生姓名"
        clearable
        style="width: 180px"
        @input="onNameInput"
        @clear="onNameInput"
      >
        <template #prefix
          ><el-icon><Search /></el-icon
        ></template>
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
      <el-button type="primary" :icon="Search" @click="reloadGrades">查询</el-button>
      <el-button :icon="RefreshRight" @click="reset">重置</el-button>
    </div>

    <!-- 学生卡片：默认全量展示，按姓名实时过滤 -->
    <div class="cards" v-loading="loading">
      <div
        v-for="c in visibleCards"
        :key="c.id"
        class="stu-card"
        :class="{ 'stu-card--empty': c.examCount === 0 }"
        @click="openDrawer(c)"
      >
        <div class="stu-card__head">
          <span class="stu-name">{{ c.name }}</span>
          <span v-if="c.grade" class="stu-grade">{{ c.grade }}</span>
        </div>
        <div class="stu-card__body">
          <div class="metric">
            <span class="metric__num">{{ c.examCount }}</span>
            <span class="metric__label">场考试</span>
          </div>
          <div v-if="c.latest" class="latest">
            <div class="latest__line">
              <el-tag :type="examTypeTag(c.latest.examType)" size="small">
                {{ examTypeLabel(c.latest.examType) }}
              </el-tag>
              <span class="latest__date">{{ c.latest.examDate }}</span>
            </div>
            <div class="latest__score" :class="pctClass(c.latest)">
              {{ c.latest.score }}<small>/{{ c.latest.fullScore }}</small>
              <span class="latest__pct">{{ percent(c.latest) }}%</span>
            </div>
          </div>
          <div v-else class="latest latest--none">暂无成绩记录</div>
        </div>
        <div class="stu-card__foot">查看全部成绩 →</div>
      </div>

      <el-empty
        v-if="!loading && !visibleCards.length"
        :description="fName ? '没有匹配的学生' : '还没有学生，请先在「学生管理」中添加'"
      />
    </div>

    <!-- 学生成绩详情抽屉 -->
    <el-drawer v-model="drawerVisible" :title="`${currentStudent?.name || ''} 的成绩`" size="580px">
      <div v-if="fExamType || fExamDate" class="drawer-filter">
        已按条件过滤：
        <el-tag v-if="fExamType" size="small" style="margin-right: 6px">{{
          examTypeLabel(fExamType)
        }}</el-tag>
        <el-tag v-if="fExamDate" size="small">{{ fExamDate }}</el-tag>
      </div>

      <div class="drawer-actions">
        <el-button
          type="primary"
          :icon="Plus"
          size="small"
          @click="openDialog(null, currentStudent)"
        >
          为该生新增成绩
        </el-button>
      </div>

      <el-table :data="currentGrades" border stripe max-height="60vh" v-loading="drawerLoading">
        <el-table-column label="日期" prop="examDate" width="120" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="examTypeTag(row.examType)" size="small">{{
              examTypeLabel(row.examType)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="得分" width="120">
          <template #default="{ row }">
            <span class="score">{{ row.score }}</span>
            <span class="score-full">/ {{ row.fullScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="百分比" width="90">
          <template #default="{ row }"
            ><span :class="pctClass(row)">{{ percent(row) }}%</span></template
          >
        </el-table-column>
        <el-table-column prop="comment" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" :icon="Delete" @click="remove(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!drawerLoading && !currentGrades.length" description="该生暂无符合条件的成绩" />
    </el-drawer>

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑成绩' : '新增成绩'" width="460px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="学生">
          <el-select v-model="form.studentId" filterable placeholder="选择学生" style="width: 100%">
            <el-option
              v-for="s in students"
              :key="s.id"
              :label="`${s.name}${s.grade ? '（' + s.grade + '）' : ''}`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="考试类型">
          <el-select v-model="form.examType" style="width: 100%">
            <el-option v-for="t in examTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="考试日期">
          <el-date-picker
            v-model="form.examDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="得分">
          <el-input-number
            v-model="form.score"
            :min="0"
            :max="form.fullScore || 1000"
            :precision="1"
            style="width: 140px"
          />
          <span class="inline-tip">/ 满分</span>
          <el-input-number
            v-model="form.fullScore"
            :min="1"
            :precision="1"
            style="width: 120px; margin-left: 8px"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.comment" placeholder="如：进步明显 / 函数仍需加强" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
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
            <el-input-number
              v-model="batchForm.fullScore"
              :min="1"
              :precision="1"
              style="width: 120px"
            />
          </el-form-item>
          <el-form-item label="考试日期">
            <el-date-picker
              v-model="batchForm.examDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 150px"
            />
          </el-form-item>
        </div>

        <el-form-item label="选择学生">
          <el-select
            v-model="batchStudentIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="多选学生"
            style="width: 100%"
          >
            <el-option v-for="s in students" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table v-if="selectedStudents.length" :data="selectedStudents" border max-height="320">
        <el-table-column prop="name" label="姓名" width="140" />
        <el-table-column label="得分">
          <template #default="{ row }">
            <el-input-number
              v-model="batchScores[row.id]"
              :min="0"
              :max="batchForm.fullScore"
              :precision="1"
              size="small"
              style="width: 160px"
            />
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="batch-empty">请先选择学生，再为每位学生录入分数</div>

      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!selectedStudents.length || batchSaving"
          :loading="batchSaving"
          @click="submitBatch"
          >确认录入</el-button
        >
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Upload, Search, Edit, Delete, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudents } from '../../api/student'
import {
  getGrades,
  getGradeCards,
  createGrade,
  updateGrade,
  deleteGrade,
  importGrades
} from '../../api/grade'
import type { Student, ExamScore, GradeCard } from '../../types'

const examTypes = [
  { value: 'final', label: '期末' },
  { value: 'mid', label: '期中' },
  { value: 'quiz', label: '小测' },
  { value: 'popquiz', label: '随堂测验' }
]

const examTypeLabel = (t: string) => examTypes.find((x) => x.value === t)?.label || t
const examTypeTag = (t: string): 'success' | 'warning' | 'primary' | 'info' | 'danger' =>
  (({ final: 'success', mid: 'primary', quiz: 'warning', popquiz: 'info' }) as Record<string, any>)[
    t
  ] || 'info'

// 所有学生（用于下拉选择）
const students = ref<Student[]>([])
// 学生卡片聚合数据（由后端返回考试次数 + 最近一次成绩，不再把全量成绩拉到前端）
const cards = ref<GradeCard[]>([])
const loading = ref(false)

// —— 提交防连点 ——
let saving = false
let batchSaving = false

// 统一的确认对话框封装：取消时不抛 unhandled rejection，返回是否确认
const confirmDialog = async (message: string, title = '提示'): Promise<boolean> => {
  try {
    await ElMessageBox.confirm(message, title, { type: 'warning' })
    return true
  } catch {
    return false
  }
}

// 筛选条件
const fName = ref('')
const fExamType = ref('')
const fExamDate = ref('')

// 姓名实时过滤
const visibleCards = computed(() => {
  const kw = fName.value.trim().toLowerCase()
  if (!kw) return cards.value
  return cards.value.filter((c) => c.name.toLowerCase().includes(kw))
})

// 抽屉
const drawerVisible = ref(false)
const currentStudent = ref<GradeCard | null>(null)
const drawerLoading = ref(false) // 成绩抽屉加载态（区分加载中与"暂无成绩"）
const currentGrades = ref<ExamScore[]>([])

const percent = (row: any) =>
  row.fullScore > 0 ? Math.round((row.score / row.fullScore) * 100) : 0
const pctClass = (row: any) => {
  const p = percent(row)
  if (p >= 90) return 'pct pct--good'
  if (p >= 60) return 'pct pct--mid'
  return 'pct pct--bad'
}

const loadStudents = async () => {
  students.value = await getStudents()
}

// 拉取学生卡片聚合数据（考试类型 / 日期为可选筛选条件）
const reloadGrades = async () => {
  loading.value = true
  try {
    cards.value = await getGradeCards({
      examType: fExamType.value || undefined,
      examDate: fExamDate.value || undefined
    })
  } finally {
    loading.value = false
  }
}

const loadStudentGrades = async (studentId: number) => {
  drawerLoading.value = true
  try {
    currentGrades.value = await getGrades({
      studentId,
      examType: fExamType.value || undefined,
      examDate: fExamDate.value || undefined
    })
  } finally {
    drawerLoading.value = false
  }
}

const onNameInput = () => {
  // 姓名仅过滤卡片，无需重新请求
}

const reset = () => {
  fName.value = ''
  fExamType.value = ''
  fExamDate.value = ''
  reloadGrades()
}

const openDrawer = async (c: any) => {
  currentStudent.value = c
  drawerVisible.value = true
  try {
    await loadStudentGrades(c.id)
  } catch {
    // 错误提示已由 request.ts 全局拦截器统一弹出
  }
}

// 新增 / 编辑
const dialogVisible = ref(false)
const form = reactive<any>({ examType: 'quiz', subject: '数学', fullScore: 100 })

const openDialog = (row?: any, student?: any) => {
  Object.keys(form).forEach((k) => delete form[k])
  if (row && row.id) {
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
  } else if (student) {
    form.examType = 'quiz'
    form.subject = '数学'
    form.fullScore = 100
    form.score = undefined
    form.examDate = ''
    form.studentId = student.id
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
  if (saving) return
  if (!form.studentId) return ElMessage.warning('请选择学生')
  if (form.score == null || form.score === '') return ElMessage.warning('请输入得分')
  if (!form.examDate) return ElMessage.warning('请选择考试日期')
  if (form.score < 0 || form.score > form.fullScore)
    return ElMessage.warning('得分需在 0 ~ 满分 之间')

  const payload = { ...form }
  saving = true
  try {
    if (form.id) {
      await updateGrade(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createGrade(payload)
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    await reloadGrades()
    if (drawerVisible.value && form.studentId) {
      await loadStudentGrades(form.studentId)
    }
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('保存失败', err)
  } finally {
    saving = false
  }
}

// 批量录入
const batchVisible = ref(false)
const batchForm = reactive<any>({ examType: 'quiz', subject: '数学', fullScore: 100, examDate: '' })
const batchStudentIds = ref<number[]>([])
const batchScores = reactive<Record<number, number | undefined>>({})

const selectedStudents = computed(() =>
  students.value.filter((s) => batchStudentIds.value.includes(s.id))
)

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
  if (batchSaving) return
  if (!batchForm.examDate) return ElMessage.warning('请选择考试日期')
  const rows = selectedStudents.value
    .map((s) => ({ studentId: s.id, score: batchScores[s.id] }))
    .filter((r) => r.score != null && r.score !== '')
  if (!rows.length) return ElMessage.warning('请至少为一名学生录入分数')
  // 有被选学生没填分数时先提示，避免静默跳过
  const missing = selectedStudents.value.length - rows.length
  if (missing > 0) {
    const okFlag = await confirmDialog(
      `${missing} 名学生未填写分数，将跳过它们。确定继续？`,
      '批量录入提示'
    )
    if (!okFlag) return
  }

  const payload = rows.map((r) => ({
    studentId: r.studentId,
    examType: batchForm.examType,
    subject: batchForm.subject,
    fullScore: batchForm.fullScore,
    examDate: batchForm.examDate,
    score: Number(r.score)
  }))
  batchSaving = true
  try {
    await importGrades(payload)
    ElMessage.success(`批量录入完成：${rows.length} 名学生`)
    batchVisible.value = false
    await reloadGrades()
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('批量录入失败', err)
  } finally {
    batchSaving = false
  }
}

const remove = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.student?.name}」的 ${row.subject}·${examTypeLabel(row.examType)} 成绩（${row.score} 分）？`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return // 用户取消
  }
  try {
    await deleteGrade(row.id)
    ElMessage.success('删除成功')
    await reloadGrades()
    if (drawerVisible.value && currentStudent.value) {
      await loadStudentGrades(currentStudent.value.id)
    }
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('删除失败', err)
  }
}

onMounted(() => {
  loadStudents()
  reloadGrades()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-spacer {
  flex: 1;
}
.hint {
  color: var(--ink-soft);
  font-size: 13px;
}
.filter-bar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 学生卡片网格 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  min-height: 120px;
}
.stu-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--paper);
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.stu-card:hover {
  border-color: rgba(150, 104, 26, 0.5);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
.stu-card--empty {
  opacity: 0.85;
}
.stu-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.stu-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.stu-grade {
  font-size: 12px;
  color: var(--ink-soft);
  background: var(--moss-soft);
  border-radius: 4px;
  padding: 1px 8px;
}
.stu-card__body {
  display: flex;
  align-items: center;
  gap: 16px;
}
.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 56px;
}
.metric__num {
  font-size: 22px;
  font-weight: 700;
  color: var(--moss-deep);
  line-height: 1.1;
}
.metric__label {
  font-size: 11px;
  color: var(--ink-soft);
}
.latest {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.latest__line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.latest__date {
  font-size: 12px;
  color: var(--ink-soft);
}
.latest__score {
  font-size: 15px;
  font-weight: 600;
}
.latest__score small {
  font-size: 11px;
  font-weight: 400;
  color: var(--ink-soft);
  margin: 0 4px 0 2px;
}
.latest__pct {
  font-size: 12px;
  margin-left: 4px;
}
.latest--none {
  font-size: 13px;
  color: var(--ink-soft);
}
.stu-card__foot {
  font-size: 12px;
  color: var(--moss);
  text-align: right;
}

/* 抽屉内 */
.drawer-filter {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ink-soft);
}
.drawer-actions {
  margin-bottom: 12px;
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
  color: var(--olive);
}
.pct--mid {
  color: var(--ochre);
}
.pct--bad {
  color: var(--el-color-danger);
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
