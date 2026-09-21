<template>
  <el-dialog
    :model-value="modelValue"
    title="编辑二级知识点"
    width="520px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="onOpen"
  >
    <div class="cur">
      <span class="cur__label">当前二级知识点</span>
      <span class="cur__name">{{ subName }}</span>
      <span class="cur__count">{{ total }} 题</span>
    </div>

    <el-form :model="form" label-width="110px" class="form">
      <el-form-item label="新名称">
        <el-select
          v-model="form.name"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="输入新名称，或选择已有二级知识点进行合并"
          style="width: 100%"
        >
          <el-option
            v-for="s in mergeOptions"
            :key="s.name"
            :label="`${s.name}（${s.total}）`"
            :value="s.name"
          />
        </el-select>
        <div class="tip">
          直接输入即重命名；选择上方已有名称，则把本组题目合并过去。
        </div>
      </el-form-item>

      <el-form-item label="所属题库">
        <el-select
          v-model="form.parent"
          filterable
          allow-create
          default-first-option
          placeholder="选择一级知识点"
          style="width: 100%"
        >
          <el-option
            v-for="t in parentOptions"
            :key="t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>
        <div class="tip">改动这里会把整组题目一起移到所选的一级知识点下。</div>
      </el-form-item>
    </el-form>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="「新名称」留空并保存，等同于删除该二级知识点，题目会移回未分类。"
    />

    <template #footer>
      <el-button type="danger" plain :icon="Delete" :loading="saving" @click="removeSub">
        删除该二级知识点
      </el-button>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { getQuestionTags, updateQuestionSubTag } from '../api/question'
import type { UpdateSubTagPayload } from '../api/question'

const props = defineProps<{
  modelValue: boolean
  /** 被编辑的二级知识点名称 */
  subName: string
  /** 该二级知识点下的题量（仅用于提示） */
  total?: number
  /** 所属一级知识点；'__empty__' 表示未分类题库 */
  knowledgeTag: string
  /** 同一一级知识点下的其它二级知识点，作为「合并」候选 */
  siblings?: { name: string; total: number }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
}>()

const EMPTY_TAG = '__empty__'

const form = reactive({ name: '', parent: '' })
// 记录打开时的原始所属题库，用于判断用户是否真的改过归属
const origParent = ref('')
const saving = ref(false)
const tagOptions = ref<string[]>([])

// 合并候选：同级其它二级知识点（排除自己）
const mergeOptions = computed(() => (props.siblings || []).filter((s) => s.name !== props.subName))

// 所属题库候选：未分类 + 全部一级知识点
const parentOptions = computed(() => [
  { label: '未分类', value: EMPTY_TAG },
  ...tagOptions.value.map((t) => ({ label: t, value: t }))
])

// 每次打开都重置表单并拉取最新的一级知识点列表
const onOpen = async () => {
  form.name = props.subName
  form.parent = props.knowledgeTag || EMPTY_TAG
  origParent.value = form.parent
  try {
    tagOptions.value = await getQuestionTags()
  } catch {
    tagOptions.value = []
  }
}

const parentLabel = (v: string) => (v === EMPTY_TAG ? '未分类' : v)

const save = async () => {
  const name = (form.name ?? '').toString().trim()
  const parentChanged = form.parent !== origParent.value
  const nameChanged = name !== props.subName

  if (!nameChanged && !parentChanged) {
    ElMessage.info('没有需要保存的修改')
    return
  }

  // 名称为空表示删除该二级知识点，先二次确认
  if (!name) {
    try {
      await ElMessageBox.confirm(
        `将「${props.subName}」下的 ${props.total ?? 0} 道题移回未分类？该二级知识点随之删除。`,
        '删除二级知识点',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      )
    } catch {
      return // 用户取消
    }
  }

  saving.value = true
  try {
    const payload: UpdateSubTagPayload = { from: props.subName, to: name }
    if (props.knowledgeTag) payload.knowledgeTag = props.knowledgeTag
    if (parentChanged) payload.toKnowledgeTag = form.parent === EMPTY_TAG ? null : form.parent

    const res = await updateQuestionSubTag(payload)

    if (!res.updated) {
      ElMessage.warning(`未找到二级知识点「${props.subName}」`)
    } else if (!name) {
      ElMessage.success(`已删除「${props.subName}」，${res.updated} 道题移回未分类`)
    } else if (parentChanged) {
      ElMessage.success(
        `已将「${props.subName}」更新为「${name}」并移入题库「${parentLabel(form.parent)}」，共 ${res.updated} 道题`
      )
    } else {
      ElMessage.success(`已将「${props.subName}」更新为「${name}」，共 ${res.updated} 道题`)
    }

    emit('saved', { name, parent: form.parent, parentChanged })
    emit('update:modelValue', false)
  } catch {
    // 错误提示已由 request.ts 统一弹出
  } finally {
    saving.value = false
  }
}

// 删除按钮：清空名称后走同一套保存逻辑（含二次确认）
const removeSub = () => {
  form.name = ''
  save()
}
</script>

<style scoped>
.cur {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: var(--paper-deep);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.cur__label {
  font-size: 13px;
  color: var(--ink-soft);
}
.cur__name {
  font-weight: 700;
  color: var(--ink);
  word-break: break-all;
}
.cur__count {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--moss-deep);
  background: var(--moss-soft);
  border-radius: 999px;
  padding: 3px 9px;
}
.form {
  margin-bottom: 4px;
}
.tip {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.6;
  margin-top: 2px;
}
</style>
