<template>
  <el-dialog
    :model-value="modelValue"
    :title="question?.id ? '编辑题目' : '新增题目'"
    width="780px"
    top="6vh"
    @update:model-value="emit('update:modelValue', $event)"
  >
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
      <el-form-item label="补充说明">
        <RichEditor v-model="form.body" />
      </el-form-item>
      <el-form-item label="答案与解析">
        <RichEditor v-model="form.answer" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getQuestionTags, createQuestion, updateQuestion } from '../api/question'
import RichEditor from './RichEditor.vue'

const props = defineProps<{ modelValue: boolean; question?: any }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const form = reactive<any>({})
const saving = ref(false)

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

const stripHtml = (html: string) =>
  (html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')

// 打开对话框时按传入题目（编辑）或空值（新增）初始化表单
const initForm = () => {
  Object.keys(form).forEach((k) => delete form[k])
  form.difficulty = 3
  form.type = 'choice'
  if (props.question) Object.assign(form, props.question)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) initForm()
  }
)

const save = async () => {
  if (!stripHtml(form.title).trim()) {
    ElMessage.warning('请填写题干')
    return
  }
  saving.value = true
  try {
    if (form.id) await updateQuestion(form.id, form)
    else await createQuestion(form)
    ElMessage.success('保存成功')
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
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

onMounted(loadTags)
</script>
