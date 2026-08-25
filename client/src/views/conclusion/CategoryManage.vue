<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-button :icon="ArrowLeft" @click="goBack">返回结论列表</el-button>
        <span class="title">知识点分类管理</span>
      </div>

      <div class="cat-layout">
        <!-- 左侧：分类管理区（自洽工作区） -->
        <div class="cat-tree">
          <div class="cat-tree__head">
            <div class="cat-tree__titles">
              <span class="cat-tree__title">知识点分类</span>
              <span class="cat-tree__count">{{ totalCount }} 个</span>
            </div>
            <el-button type="primary" :icon="Plus" @click="openCreate()">新建分类</el-button>
          </div>

          <p class="cat-tree__hint">
            点选左侧分类即可在右侧编辑；新建时在右侧选择「上级分类」决定层级。
          </p>

          <div class="cat-tree__body">
            <el-tree
              v-if="tree.length"
              :data="tree"
              node-key="id"
              :props="treeProps"
              highlight-current
              default-expand-all
              :expand-on-click-node="false"
              @node-click="onNodeClick"
              class="cat-tree__tree"
            >
              <template #default="{ data }">
                <span class="tree-node" :class="{ 'is-child': isChild(data) }">
                  <span
                    class="tree-node__marker"
                    :class="isChild(data) ? 'is-leaf' : 'is-parent'"
                  ></span>
                  <span class="tree-node__label">{{ data.name }}</span>
                  <span v-if="isChild(data)" class="tree-node__level">二级</span>
                  <span class="tree-node__actions">
                    <el-tooltip
                      v-if="!isChild(data)"
                      content="新建子分类"
                      placement="top"
                      :show-after="400"
                    >
                      <el-icon class="tree-node__icon" @click.stop="openCreate(data.id)"
                        ><Plus
                      /></el-icon>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top" :show-after="400">
                      <el-icon
                        class="tree-node__icon tree-node__icon--danger"
                        @click.stop="remove(data)"
                        ><Delete
                      /></el-icon>
                    </el-tooltip>
                  </span>
                </span>
              </template>
            </el-tree>

            <!-- 空状态引导 -->
            <div v-else class="cat-tree__empty">
              <el-icon class="cat-tree__empty-icon"><FolderOpened /></el-icon>
              <p class="cat-tree__empty-title">还没有任何分类</p>
              <p class="cat-tree__empty-sub">点击上方「新建一级分类」，开始整理你的知识点体系</p>
            </div>
          </div>
        </div>

        <!-- 右侧：编辑表单 -->
        <div class="cat-form">
          <div class="cat-form__head">
            <span class="cat-form__title">{{ form.id ? '编辑分类' : '新建分类' }}</span>
            <span v-if="parentName" class="cat-form__parent">所属：{{ parentName }}</span>
          </div>

          <el-form :model="form" label-width="80px">
            <el-form-item label="名称">
              <el-input v-model="form.name" placeholder="如：代数 / 几何 / 函数" maxlength="50" />
            </el-form-item>
            <el-form-item label="上级分类">
              <el-select
                v-model="form.parentId"
                placeholder="无（作为一级分类）"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="c in topLevelCategories"
                  :key="c.id"
                  :label="c.name"
                  :value="c.id"
                  :disabled="c.id === form.id"
                />
              </el-select>
              <div class="cat-form__tip">
                留空即为一级分类；选择某个一级分类后，本分类将成为其子分类（二级）。
              </div>
            </el-form-item>
            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" :max="9999" />
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                maxlength="255"
                placeholder="可选"
              />
            </el-form-item>
          </el-form>

          <div class="cat-form__actions">
            <el-button v-if="form.id" type="danger" plain :icon="Delete" @click="removeSelected"
              >删除</el-button
            >
            <span class="spacer"></span>
            <el-button @click="resetForm">清空</el-button>
            <el-button type="primary" :icon="Check" @click="save">保存</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Delete, ArrowLeft, Check, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/category'

const router = useRouter()
const tree = ref<any[]>([])
const treeProps = { label: 'name', children: 'children' }
const totalCount = ref(0)

const form = reactive<any>({ id: null, name: '', parentId: null, sort: 0, remark: '' })

// 一级（parentId 为空）/ 二级（有父级）的判定，用于层级标记与视觉权重
const isChild = (data: any) => data.parentId != null
const countNodes = (nodes: any[]): number =>
  nodes.reduce((sum, n) => sum + 1 + countNodes(n.children || []), 0)

// 「上级分类」下拉的候选：仅允许二级嵌套，故父级只能是一级分类
const topLevelCategories = computed(() => tree.value.filter((n) => n.parentId == null))

// 当前表单对应的父分类名（新建/编辑子分类时提示所属）
const parentName = computed(() => {
  const pid = form.parentId === '' || form.parentId == null ? null : form.parentId
  if (pid == null) return ''
  const found = findNode(tree.value, pid)
  return found ? found.name : ''
})

const findNode = (nodes: any[], id: number): any => {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const r = findNode(n.children, id)
      if (r) return r
    }
  }
  return null
}

const load = async () => {
  tree.value = await getCategories()
  totalCount.value = countNodes(tree.value)
}

const resetForm = () => {
  form.id = null
  form.name = ''
  form.parentId = null
  form.sort = 0
  form.remark = ''
}

// 新建：parentId 可选（为空则新建一级分类）
const openCreate = (parentId?: number) => {
  resetForm()
  form.parentId = parentId ?? null
}

// 点击树节点 → 编辑
const onNodeClick = (data: any) => {
  form.id = data.id
  form.name = data.name
  form.parentId = data.parentId ?? null
  form.sort = data.sort ?? 0
  form.remark = data.remark || ''
}

const save = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写分类名称')
    return
  }
  const payload = {
    name: form.name.trim(),
    parentId: form.parentId === '' || form.parentId == null ? null : Number(form.parentId),
    sort: form.sort,
    remark: form.remark || null
  }
  if (form.id) {
    await updateCategory(form.id, payload)
    ElMessage.success('已保存')
  } else {
    await createCategory(payload)
    ElMessage.success('已创建')
  }
  await load()
  resetForm()
}

const remove = (data: any) => doRemove(data.id)

const removeSelected = () => {
  if (!form.id) return
  doRemove(form.id)
}

const doRemove = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该分类？', '提示', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteCategory(id)
    ElMessage.success('删除成功')
    if (form.id === id) resetForm()
    await load()
  } catch (e: any) {
    // 错误提示已由 request.ts 全局拦截器统一弹出
    console.error('删除分类失败', e)
  }
}

const goBack = () => router.push('/conclusions')

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
.spacer {
  flex: 1;
}

.cat-layout {
  display: flex;
  gap: 16px;
  min-height: 460px;
}

/* —— 左侧：分类管理区 —— */
.cat-tree {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--paper-deep);
  overflow: hidden;
}
.cat-tree__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--line);
}
.cat-tree__titles {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.cat-tree__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.cat-tree__count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--moss-deep);
  background: var(--moss-soft);
  border-radius: 999px;
  padding: 1px 8px;
  line-height: 18px;
}
.cat-tree__hint {
  margin: 0;
  padding: 10px 14px 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
}
.cat-tree__body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 12px;
}

/* 树节点 */
.cat-tree :deep(.el-tree) {
  background: transparent;
}
.cat-tree :deep(.el-tree-node__content) {
  height: 38px;
  border-radius: var(--radius-sm);
  transition: background-color 0.18s ease;
}
.cat-tree :deep(.el-tree-node__content):hover {
  background: #e7efec;
}
.cat-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--moss-soft);
  box-shadow: inset 3px 0 0 var(--moss);
}
.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 4px;
  min-width: 0;
}
.tree-node__marker {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.tree-node__marker.is-parent {
  background: var(--moss);
}
.tree-node__marker.is-leaf {
  background: transparent;
  border: 2px solid var(--moss);
  width: 7px;
  height: 7px;
}
.tree-node__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
}
.tree-node:not(.is-child) .tree-node__label {
  font-weight: 600;
}
.tree-node__level {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1;
  color: var(--moss-deep);
  background: var(--moss-soft);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px 5px;
}
.tree-node__actions {
  flex-shrink: 0;
  display: none;
  gap: 4px;
}
.tree-node:hover .tree-node__actions {
  display: inline-flex;
}
.tree-node__icon {
  cursor: pointer;
  color: var(--moss);
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.tree-node__icon:hover {
  background: #fffdf9;
  color: var(--moss-deep);
}
.tree-node__icon--danger {
  color: #d9534f;
}
.tree-node__icon--danger:hover {
  background: #fdecec;
  color: #c0392b;
}

/* 空状态 */
.cat-tree__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  padding: 24px 16px;
}
.cat-tree__empty-icon {
  font-size: 40px;
  color: var(--moss);
  opacity: 0.5;
  margin-bottom: 12px;
}
.cat-tree__empty-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.cat-tree__empty-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  max-width: 220px;
  color: var(--ink-soft);
}

/* —— 右侧：编辑表单 —— */
.cat-form {
  flex: 1;
  padding: 4px 8px;
}
.cat-form__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 18px;
}
.cat-form__title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}
.cat-form__parent {
  font-size: 13px;
  color: var(--ink-soft);
}
.cat-form__tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
  margin-top: 4px;
}
.cat-form__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
</style>
