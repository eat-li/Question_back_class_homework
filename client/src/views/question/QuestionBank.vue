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
        <div class="kb-card__name">{{ g.label }}</div>
        <div class="kb-card__count">{{ g.total }} 题</div>
        <div class="kb-card__types">
          <span v-if="g.choice">选择 {{ g.choice }}</span>
          <span v-if="g.fill">填空 {{ g.fill }}</span>
          <span v-if="g.solve">解答 {{ g.solve }}</span>
        </div>
      </div>
    </div>
    <el-empty v-if="!loading && !groups.length" description="暂无知识点" />
  </el-card>

  <QuestionFormDialog v-model="dialogVisible" @saved="load" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { getQuestionStats } from '../../api/question'
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
.kb-card__name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
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
</style>
