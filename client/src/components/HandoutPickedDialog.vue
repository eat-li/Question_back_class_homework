<script lang="ts">
// 已选内容弹窗：只负责展示顺序与顺序调整，数据由父级（讲义页）持有并实时回流，
// 因此弹窗内的排序操作会立刻反映到右侧打印预览。
export interface HandoutPickedRow {
  key: string
  /** 内容类型名：题目 / 结论 / 知识点 */
  typeName: string
  /** el-tag 的类型 */
  tagType: 'primary' | 'success' | 'warning'
  /** 纯文本标题（结论、知识点；题目缺失时也走这里） */
  plain: string
  /** 富文本标题（题目题干），优先级高于 plain */
  html?: string
  /** 次要说明：题型/知识点、所属分类、含多少条结论 */
  sub?: string
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import RichContent from './RichContent.vue'

const props = defineProps<{
  modelValue: boolean
  rows: HandoutPickedRow[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'move', index: number, delta: number): void
  (e: 'remove', index: number): void
  (e: 'clear'): void
}>()

const stat = computed(() => {
  const count = (name: string) => props.rows.filter((r) => r.typeName === name).length
  return `共 ${props.rows.length} 项 · 题目 ${count('题目')} · 结论 ${count('结论')} · 知识点 ${count('知识点')}`
})

const move = (index: number, delta: number) => {
  const to = index + delta
  if (to < 0 || to >= props.rows.length) return
  emit('move', index, delta)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="已选内容"
    width="620px"
    top="8vh"
    append-to-body
    class="picked-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="pd-head">
      <span class="pd-stat">{{ stat }}</span>
      <el-button v-if="rows.length" size="small" text type="danger" @click="emit('clear')"
        >清空</el-button
      >
    </div>

    <div class="pd-list">
      <el-empty v-if="!rows.length" description="还没有选择内容，关闭后可继续从左侧添加" />
      <TransitionGroup name="pd" tag="div">
        <div v-for="(row, idx) in rows" :key="row.key" class="pd-row">
          <el-tag size="small" :type="row.tagType" class="pd-row__tag">{{ row.typeName }}</el-tag>
          <div class="pd-row__main">
            <RichContent v-if="row.html" class="pd-row__title" :html="row.html" />
            <span v-else class="pd-row__title">{{ row.plain }}</span>
            <span v-if="row.sub" class="pd-row__sub">{{ row.sub }}</span>
          </div>
          <span class="pd-row__ops">
            <el-icon :class="{ 'is-disabled': idx === 0 }" @click="move(idx, -1)">
              <ArrowUp />
            </el-icon>
            <el-icon :class="{ 'is-disabled': idx === rows.length - 1 }" @click="move(idx, 1)">
              <ArrowDown />
            </el-icon>
            <el-icon class="is-danger" @click="emit('remove', idx)"><Delete /></el-icon>
          </span>
        </div>
      </TransitionGroup>
    </div>

    <template #footer>
      <el-button type="primary" plain @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.pd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--hair);
}
.pd-stat {
  font-size: 13px;
  color: var(--ink-soft);
}
.pd-list {
  max-height: 58vh;
  overflow-y: auto;
  position: relative;
}
.pd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  margin-bottom: 6px;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.72);
  position: relative;
}
.pd-row__tag {
  flex-shrink: 0;
}
.pd-row__main {
  flex: 1;
  min-width: 0;
}
.pd-row__title {
  font-size: 13px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pd-row__title :deep(img) {
  max-height: 70px;
  max-width: 100%;
  object-fit: contain;
}
.pd-row__sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-soft);
}
.pd-row__ops {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-soft);
}
.pd-row__ops .el-icon {
  cursor: pointer;
  transition: color 0.15s ease;
}
.pd-row__ops .el-icon:hover {
  color: var(--moss-deep);
}
.pd-row__ops .el-icon.is-danger:hover {
  color: var(--accent);
}
.pd-row__ops .el-icon.is-disabled {
  opacity: 0.32;
  cursor: not-allowed;
}
/* 上移/下移时行位置的过渡 */
.pd-move {
  transition: transform 0.25s var(--ease);
}
</style>
