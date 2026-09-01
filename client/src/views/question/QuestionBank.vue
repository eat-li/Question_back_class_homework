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
        <div v-if="g.subTags && g.subTags.length" class="kb-card__subs">
          <span
            v-for="s in g.subTags"
            :key="s.name"
            class="kb-card__sub"
            @click.stop="goSubKnowledge(g.tag, s.name)"
          >
            {{ s.name }} {{ s.total }}
          </span>
        </div>
      </div>
    </div>
    <el-empty v-if="!loading && !groups.length" description="暂无知识点" />
  </el-card>

  <QuestionFormDialog v-model="dialogVisible" @saved="load" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Plus, EditPen } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getQuestionStats, renameQuestionTag } from '../../api/question'
import QuestionFormDialog from '../../components/QuestionFormDialog.vue'
import type { QuestionStats } from '../../types'

const router = useRouter()
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const groups = ref<QuestionStats[]>([])

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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}
.kb-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 18px;
  cursor: pointer;
  background: #fffdf9;
  transition: all 0.2s ease;
}
.kb-card:hover {
  border-color: var(--moss);
  box-shadow: 0 6px 16px rgba(107, 143, 113, 0.18);
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
.kb-card__subs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}
.kb-card__sub {
  font-size: 12px;
  line-height: 1;
  color: var(--moss-deep);
  background: var(--moss-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 9px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.kb-card__sub:hover {
  background: var(--moss);
  color: #fffdf9;
  border-color: var(--moss);
}
</style>
