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
        <RichEditor v-model="form.title" ai-field="stem" />
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
      <el-form-item label="一级知识点">
        <el-select
          v-model="form.knowledgeTag"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入一级知识点"
          style="width: 100%"
          @change="onPrimaryTagChange"
        >
          <el-option v-for="t in knowledgeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <div class="form-tip">
          列表只列出题库里已经用过的知识点；要新建直接输入名称后回车即可。
        </div>
      </el-form-item>
      <el-form-item label="二级知识点">
        <el-select
          v-model="form.knowledgeSubTag"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="选择或输入二级知识点（可选）"
          style="width: 100%"
          :disabled="!form.knowledgeTag"
          @change="loadSubTags"
        >
          <el-option v-for="t in subKnowledgeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <div class="form-tip">二级知识点归属于某个一级知识点，直接输入新名称即可新增；一级为空时不可选。</div>
      </el-form-item>
      <el-form-item label="补充说明">
        <RichEditor v-model="form.body" ai-field="body" />
      </el-form-item>
      <el-form-item label="答案与解析">
        <RichEditor v-model="form.answer" ai-field="answer" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getQuestionTags, getQuestionSubTags, createQuestion, updateQuestion } from '../api/question'
import RichEditor from './RichEditor.vue'

const props = defineProps<{ modelValue: boolean; question?: any }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const form = reactive<any>({})
const saving = ref(false)

// 一级知识点候选：只取题库里已经用过的知识点，不再内置预设项，
// 避免下拉里混进一堆从没使用过的名字。需要新建时直接输入名称即可（allow-create）。
const knowledgeOptions = ref<string[]>([])
const subKnowledgeOptions = ref<string[]>([])

// 拉取题库里已经用过的知识点作为候选
const loadTags = async () => {
  try {
    knowledgeOptions.value = await getQuestionTags()
  } catch {
    knowledgeOptions.value = []
  }
}

// 按当前一级知识点加载其下已有的二级知识点
const loadSubTags = async () => {
  if (!form.knowledgeTag) {
    subKnowledgeOptions.value = []
    return
  }
  try {
    const subs = await getQuestionSubTags(form.knowledgeTag)
    subKnowledgeOptions.value = subs.map((s) => s.name)
  } catch {
    subKnowledgeOptions.value = []
  }
}

// 一级知识点变化：清空已选二级，并刷新二级候选
const onPrimaryTagChange = async () => {
  form.knowledgeSubTag = null
  await loadSubTags()
}

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
  // 编辑时按已有的一级知识点加载二级候选
  loadSubTags()
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      initForm()
      // 每次打开都重新拉取：刚新建过的知识点要能立刻出现在候选里
      loadTags()
    }
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
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-top: 4px;
}
</style>
