<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="按题干搜索"
        clearable
        style="width: 200px"
        @keyup.enter="load"
      />
      <el-select v-model="type" placeholder="题型" clearable style="width: 120px">
        <el-option label="选择题" value="choice" />
        <el-option label="填空题" value="fill" />
        <el-option label="解答题" value="solve" />
      </el-select>
      <el-button type="primary" @click="load">查询</el-button>
      <el-button type="primary" @click="openDialog()">新增题目</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column label="题干" show-overflow-tooltip min-width="240">
        <template #default="{ row }">{{ stripHtml(row.title) }}</template>
      </el-table-column>
      <el-table-column label="题型" width="100">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="80" />
      <el-table-column prop="knowledgeTag" label="知识点" width="140" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑题目' : '新增题目'" width="780px" top="6vh">
    <el-form :model="form" label-width="110px">
      <el-form-item label="题干">
        <RichEditor v-model="form.title" />
      </el-form-item>
      <el-form-item label="题型">
        <el-select v-model="form.type" style="width: 100%">
          <el-option label="选择题" value="choice" />
          <el-option label="填空题" value="fill" />
          <el-option label="解答题" value="solve" />
        </el-select>
      </el-form-item>
      <el-form-item label="难度">
        <el-input-number v-model="form.difficulty" :min="1" :max="5" />
      </el-form-item>
      <el-form-item label="知识点">
        <el-select
          v-model="form.knowledgeTag"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入知识点"
          style="width: 100%"
        >
          <el-option v-for="t in knowledgeOptions" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item label="题目内容">
        <RichEditor v-model="form.body" />
      </el-form-item>
      <el-form-item label="答案与解析">
        <RichEditor v-model="form.answer" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getQuestions, getQuestionTags, createQuestion, updateQuestion, deleteQuestion } from '../../api/question'
import RichEditor from '../../components/RichEditor.vue'

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}

// 知识点预设选项（新增题目时快速选择，也可自行输入）
const knowledgePresets = [
  '函数',
  '解析几何',
  '立体几何',
  '概率统计',
  '数列',
  '三角函数',
  '导数',
  '向量',
  '不等式',
  '集合与逻辑'
]
const knowledgeOptions = ref<string[]>([...knowledgePresets])

const list = ref([])
const loading = ref(false)
const keyword = ref('')
const type = ref('')
const dialogVisible = ref(false)
const form = reactive<any>({ difficulty: 3, type: 'choice' })

const typeLabel = (t: string) => typeMap[t] || t

// 富文本 HTML 转纯文本，用于列表显示
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
    list.value = await getQuestions({ keyword: keyword.value, type: type.value })
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: any) => {
  Object.keys(form).forEach((k) => delete form[k])
  form.difficulty = 3
  form.type = 'choice'
  if (row) Object.assign(form, row)
  dialogVisible.value = true
}

const save = async () => {
  if (!stripHtml(form.title).trim()) {
    ElMessage.warning('请填写题干')
    return
  }
  if (form.id) await updateQuestion(form.id, form)
  else await createQuestion(form)
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

const remove = async (row: any) => {
  await ElMessageBox.confirm('确定删除该题目？', '提示', { type: 'warning' })
  await deleteQuestion(row.id)
  ElMessage.success('删除成功')
  load()
}

const loadTags = async () => {
  try {
    const tags = await getQuestionTags()
    // 预设 + 题库里已用过的知识点，合并去重
    knowledgeOptions.value = Array.from(new Set([...knowledgePresets, ...tags]))
  } catch {
    /* 忽略，保留预设选项 */
  }
}

onMounted(() => {
  load()
  loadTags()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
</style>
