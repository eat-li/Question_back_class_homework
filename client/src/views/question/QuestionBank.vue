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
      <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增题目</el-button>
      <el-button :icon="Download" @click="exportVisible = true">导出全部 PDF</el-button>
    </div>

    <div v-loading="loading" class="kb-grid">
      <div v-for="g in groups" :key="g.tag" class="kb-card" @click="goKnowledge(g.tag)">
        <div class="kb-card__head">
          <div class="kb-card__name">{{ g.label }}</div>
          <el-tooltip
            v-if="g.tag !== '__empty__'"
            content="重命名题库"
            placement="top"
            :show-after="400"
          >
            <el-icon class="kb-card__rename" @click.stop="renameTag(g)"><EditPen /></el-icon>
          </el-tooltip>
        </div>
        <div class="kb-card__count">{{ g.total }} 题</div>
        <div class="kb-card__types">
          <span v-if="g.choice">选择 {{ g.choice }}</span>
          <span v-if="g.fill">填空 {{ g.fill }}</span>
          <span v-if="g.solve">解答 {{ g.solve }}</span>
        </div>
        <ul v-if="g.subTags && g.subTags.length" class="kb-subs">
          <li
            v-for="s in sortedSubs(g)"
            :key="s.name"
            class="kb-subs__item"
            :title="`查看「${s.name}」下的 ${s.total} 道题`"
            @click.stop="goSubKnowledge(g.tag, s.name)"
          >
            <span class="kb-subs__name">{{ s.name }}</span>
            <span class="kb-subs__count">{{ s.total }}</span>
            <span
              class="kb-subs__edit"
              title="编辑该二级知识点（重命名 / 合并 / 删除）"
              @click.stop="openSubEdit(g, s)"
            >
              <EditPen />
            </span>
          </li>
        </ul>
      </div>
    </div>
    <el-empty v-if="!loading && !groups.length" description="暂无知识点" />
  </el-card>

  <QuestionFormDialog v-model="dialogVisible" @saved="load" />

  <SubTagEditDialog
    v-model="subEditVisible"
    :sub-name="subEditTarget.name"
    :total="subEditTarget.total"
    :knowledge-tag="subEditTarget.parent"
    :siblings="subEditTarget.siblings"
    @saved="load"
  />

  <!-- 导出整个题库为 PDF（不折叠、不受卡片上的搜索词影响，导出的就是全部题目） -->
  <QuestionExportDialog
    v-model="exportVisible"
    :scope="{}"
    scope-label="题库全部题目"
    allow-group
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Plus, EditPen, Download } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getQuestionStats, renameQuestionTag } from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'
import SubTagEditDialog from '../../components/SubTagEditDialog.vue'
import QuestionExportDialog from '../../components/QuestionExportDialog.vue'
import type { QuestionStats } from '../../types'

const router = useRouter()
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const groups = ref<QuestionStats[]>([])
const exportVisible = ref(false)

// 二级知识点全部平铺展示、不做折叠，卡片按内容自然撑开；
// 只按题量降序排列，让常用的排在前面，数量多时更好扫读。
const sortedSubs = (g: QuestionStats) =>
  [...(g.subTags || [])].sort((a, b) => b.total - a.total)

// —— 二级知识点编辑（重命名 / 合并 / 删除 / 换题库）——
const subEditVisible = ref(false)
const subEditTarget = ref<{
  name: string
  total: number
  parent: string
  siblings: { name: string; total: number }[]
}>({ name: '', total: 0, parent: '', siblings: [] })

const openSubEdit = (g: QuestionStats, s: { name: string; total: number }) => {
  subEditTarget.value = {
    name: s.name,
    total: s.total,
    parent: g.tag,
    siblings: (g.subTags || []).filter((x) => x.name !== s.name)
  }
  subEditVisible.value = true
}

// 拉取知识点聚合统计，后端按知识点 GROUP BY，避免全量题目传到前端
const load = async () => {
  loading.value = true
  try {
    groups.value = await getQuestionStats({ keyword: keyword.value })
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  dialogVisible.value = true
}

const goKnowledge = (tag: string) => {
  router.push(`/questions/knowledge/${encodeURIComponent(tag)}`)
}

// 点击二级知识点：进入对应一级知识点页面并预选该二级
const goSubKnowledge = (tag: string, sub: string) => {
  router.push(`/questions/knowledge/${encodeURIComponent(tag)}?sub=${encodeURIComponent(sub)}`)
}

// 重命名题库（一级知识点）：批量更新该知识点下所有题目的 knowledgeTag
const renameTag = async (g: QuestionStats) => {
  try {
    const { value } = await ElMessageBox.prompt(
      `重命名题库「${g.label}」（当前 ${g.total} 道题）：`,
      '重命名题库',
      {
        inputValue: g.label,
        inputPlaceholder: '新题库名称',
        inputValidator: (v) => (v && v.trim() ? true : '名称不能为空'),
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )
    const to = value.trim()
    if (!to || to === g.label) return
    await renameQuestionTag(g.tag, to)
    ElMessage.success(`已重命名为「${to}」`)
    load()
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return
    // 其它错误已由 request.ts 统一提示
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.kb-grid {
  display: grid;
  /*
   * 卡片再放大一档：最小列宽 220→260px，实测卡片宽 239→302px、每行 4 张。
   * 302px 卡片的内宽约 266px，正好容下两个二级标签（每个约 100px + 间距），
   * 二级全部平铺时行数减半，卡片被撑高的幅度也随之变小。
   */
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  /* 二级很多的卡片自己撑高，不拉伸同排其它卡 */
  align-items: start;
}
.kb-card {
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  padding: 18px;
  cursor: pointer;
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--shadow-soft);
  transition: all 0.2s ease;
}
.kb-card:hover {
  border-color: rgba(150, 104, 26, 0.5);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
.kb-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kb-card__name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-card__rename {
  flex-shrink: 0;
  cursor: pointer;
  color: var(--ink-soft);
  font-size: 14px;
  padding: 3px;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
  visibility: hidden;
}
.kb-card:hover .kb-card__rename {
  visibility: visible;
}
.kb-card__rename:hover {
  color: var(--moss-deep);
  background: var(--moss-soft);
}
.kb-card__count {
  font-size: 13px;
  color: var(--moss-deep);
  margin: 6px 0;
}
.kb-card__types {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--ink-soft);
}
/* 二级知识点列表：每行一个，名称左对齐成一列、题量右对齐成一列，
   比胶囊换行更好扫读——胶囊每个宽度随名字长短变化，换行后左右都参差不齐。 */
.kb-subs {
  list-style: none;
  margin: 10px 0 0;
  padding: 6px 0 0;
  border-top: 1px solid var(--hair);
}
.kb-subs__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  margin: 0 -6px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color var(--dur) var(--ease);
}
.kb-subs__item + .kb-subs__item {
  border-top: 1px solid var(--hair);
}
.kb-subs__item:hover {
  background: rgba(255, 255, 255, 0.62);
}
.kb-subs__name {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--dur) var(--ease);
}
.kb-subs__item:hover .kb-subs__name {
  color: var(--ink);
}
.kb-subs__count {
  flex-shrink: 0;
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--ink-soft);
  transition: color var(--dur) var(--ease);
}
.kb-subs__item:hover .kb-subs__count {
  color: var(--moss-deep);
}
/* 编辑入口：平时宽度为 0 不占位，悬停该行才展开——否则每行都要为一个看不见的图标让出十几个像素 */
.kb-subs__edit {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  width: 0;
  overflow: hidden;
  opacity: 0;
  font-size: 12px;
  cursor: pointer;
  transition:
    width var(--dur) var(--ease),
    opacity var(--dur) var(--ease);
}
.kb-subs__item:hover .kb-subs__edit {
  width: 15px;
  opacity: 0.75;
}
.kb-subs__edit:hover {
  opacity: 1;
}
</style>
