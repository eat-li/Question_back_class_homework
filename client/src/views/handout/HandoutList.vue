<template>
  <div class="handout-list">
    <el-card>
      <div class="toolbar">
        <span class="title">讲义列表</span>
        <span class="count">共 {{ total }} 份</span>
        <span class="spacer"></span>
        <el-input
          v-model="keyword"
          class="search"
          placeholder="按标题搜索"
          clearable
          @keyup.enter="onFilter"
          @clear="onFilter"
        >
          <template #append>
            <el-button :icon="Search" aria-label="搜索" @click="onFilter" />
          </template>
        </el-input>
        <el-button type="primary" :icon="Plus" @click="goCreate">发布讲义</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        border
        stripe
        empty-text="还没有讲义，点右上角「发布讲义」开始制作"
        @row-click="open"
      >
        <el-table-column prop="title" label="讲义标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="内容构成" min-width="300">
          <template #default="{ row }">
            <div class="compose">
              <template v-if="statOf(row).total">
                <span v-if="statOf(row).question" class="chip"
                  >题目 <b>{{ statOf(row).question }}</b></span
                >
                <span v-if="statOf(row).conclusion" class="chip"
                  >结论 <b>{{ statOf(row).conclusion }}</b></span
                >
                <span v-if="statOf(row).knowledge" class="chip chip--kp"
                  >知识点 <b>{{ statOf(row).knowledge }}</b></span
                >
                <span class="compose-total">共 {{ statOf(row).total }} 项</span>
              </template>
              <span v-else class="compose-empty">空讲义</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{
            formatDateTime(row.updatedAt || row.createdAt)
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button size="small" :icon="EditPen" @click.stop="open(row)">打开编辑</el-button>
              <el-button size="small" type="danger" :icon="Delete" @click.stop="remove(row)"
                >删除</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > pageSize" class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          background
          @current-change="load"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, EditPen, Delete } from '@element-plus/icons-vue'
import { getHandouts, deleteHandout, type Handout } from '../../api/handout'
import { formatDateTime } from '../../utils/format'

const router = useRouter()

const list = ref<Handout[]>([])
const total = ref(0)
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 20

// 内容构成：讲义 items 为有序 JSON 数组，直接按类型计数
const statOf = (row: Handout) => {
  const items = Array.isArray(row.items) ? row.items : []
  const by = (t: string) => items.filter((it) => it.type === t).length
  return {
    question: by('question'),
    conclusion: by('conclusion'),
    knowledge: by('knowledge'),
    total: items.length
  }
}

const load = async () => {
  loading.value = true
  try {
    const res = await getHandouts({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const onFilter = () => {
  page.value = 1
  load()
}

// 打开：把讲义 id 带到编辑器（编辑器按 ?id= 载入内容）
const open = (row: Handout) => router.push({ path: '/handouts', query: { id: String(row.id) } })
const goCreate = () => router.push('/handouts')

const remove = async (row: Handout) => {
  try {
    await ElMessageBox.confirm(`确定删除讲义「${row.title}」？此操作不可恢复。`, '删除讲义确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await deleteHandout(row.id)
  ElMessage.success('删除成功')
  // 删掉当页最后一条时回退一页，避免停在空页
  if (list.value.length === 1 && page.value > 1) page.value -= 1
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
  font-size: 13px;
  color: var(--ink-soft);
}
.spacer {
  flex: 1;
}
.search {
  width: 240px;
}
.compose {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  border: 1px solid var(--hair);
  font-size: 12px;
  color: var(--ink-regular);
}
.chip b {
  font-family: var(--font-data);
  font-size: 13px;
  color: var(--ink);
}
.chip--kp {
  background: var(--moss-soft);
  border-color: transparent;
  color: var(--moss-deep);
}
.chip--kp b {
  color: var(--moss-deep);
}
.compose-total {
  font-size: 12px;
  color: var(--ink-soft);
}
.compose-empty {
  font-size: 13px;
  color: var(--ink-soft);
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
:deep(.el-table__row) {
  cursor: pointer;
}
</style>
