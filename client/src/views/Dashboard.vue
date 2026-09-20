<template>
  <div class="dashboard" v-loading="loading">
    <section class="dashboard-intro">
      <div>
        <p class="intro-eyebrow">今日概览</p>
        <h1 class="intro-title">把教学线索收拢在一处</h1>
      </div>
      <p class="intro-copy">题库、作业与成绩数据会在这里同步更新，方便快速判断下一步教学安排。</p>
    </section>
    <el-alert
      v-if="loadError"
      title="数据加载失败"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <el-button link type="primary" @click="load">重试</el-button>
    </el-alert>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <article v-for="(c, index) in statCards" :key="c.label" class="stat-card">
        <span class="stat-index">0{{ index + 1 }}</span>
        <div class="stat-icon" :style="{ background: c.bg, color: c.color }">
          <el-icon :size="22"><component :is="c.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </div>
      </article>
    </div>

    <!-- 图表 -->
    <div class="chart-grid">
      <el-card class="chart-card">
        <template #header><span class="chart-title">题型分布</span></template>
        <div ref="typeRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header><span class="chart-title">难度分布</span></template>
        <div ref="difficultyRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card chart-card--wide">
        <template #header><span class="chart-title">知识点 TOP 10</span></template>
        <div ref="knowledgeRef" class="chart"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Document, User, Notebook, Trophy } from '@element-plus/icons-vue'
import { getStats } from '../api/stats'
import { useECharts } from '../composables/useECharts'
import { questionTypeLabel } from '../utils/format'

const stats = ref<any>(null)
const loading = ref(false)
const loadError = ref(false)
const typeRef = ref<HTMLElement>()
const difficultyRef = ref<HTMLElement>()
const knowledgeRef = ref<HTMLElement>()

const { init: initChart, resizeAll } = useECharts()

const typeLabel = questionTypeLabel

// 数据未就绪时卡片显示「—」，避免慢网先闪 0 值
const statCards = computed(() => {
  const c = stats.value?.counts || {}
  const v = (n: number | undefined) => (stats.value ? (n ?? 0) : '—')
  return [
    {
      label: '题目总数',
      value: v(c.questionCount),
      icon: Document,
      bg: '#e1ebe5',
      color: '#24483f'
    },
    { label: '学生人数', value: v(c.studentCount), icon: User, bg: '#eee8dc', color: '#7f5e28' },
    {
      label: '作业总数',
      value: v(c.homeworkCount),
      icon: Notebook,
      bg: '#e7ebe3',
      color: '#56634d'
    },
    {
      label: '成绩记录',
      value: v(c.submissionCount),
      icon: Trophy,
      bg: '#f5e5e1',
      color: '#934236'
    }
  ]
})

const renderOne = (el: HTMLElement, option: any) => {
  initChart(el, option)
}

const renderCharts = () => {
  const s = stats.value
  if (!s) return

  // 题型饼图
  const typeData = (s.byType || []).map((it: any) => ({
    name: typeLabel(it.type),
    value: Number(it.count)
  }))
  renderOne(typeRef.value!, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 题 ({d}%)' },
    legend: { bottom: 0, icon: 'circle' },
    color: ['#2f6658', '#a47732', '#b24c3d'],
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fbfdfc', borderWidth: 2 },
        label: { formatter: '{b}\n{c} 题', fontSize: 12, color: '#3a403d' },
        data: typeData
      }
    ]
  })

  // 难度柱状图
  const diffMap = new Map(
    (s.byDifficulty || []).map((it: any) => [String(it.difficulty), Number(it.count)])
  )
  const diffData = [1, 2, 3, 4, 5].map((d) => diffMap.get(String(d)) || 0)
  renderOne(difficultyRef.value!, {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 28 },
    xAxis: {
      type: 'category',
      data: ['★1', '★2', '★3', '★4', '★5'],
      axisLine: { lineStyle: { color: '#dde5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#7d8681' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#eaf0ed' } },
      axisLabel: { color: '#7d8681' }
    },
    series: [
      {
        type: 'bar',
        data: diffData,
        barWidth: '46%',
        itemStyle: { color: '#5b7d74', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })

  // 知识点横向柱状图
  const know = (s.byKnowledge || []).map((it: any) => ({
    name: it.knowledgeTag,
    value: Number(it.count)
  }))
  renderOne(knowledgeRef.value!, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 90, right: 30, top: 10, bottom: 28 },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#eaf0ed' } },
      axisLabel: { color: '#7d8681' }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: know.map((k: any) => k.name),
      axisLine: { lineStyle: { color: '#dde5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#4a514d' }
    },
    series: [
      {
        type: 'bar',
        data: know.map((k: any) => k.value),
        barWidth: '52%',
        itemStyle: { color: '#c2a878', borderRadius: [0, 6, 6, 0] }
      }
    ]
  })
}

const handleResize = resizeAll

const load = async () => {
  loading.value = true
  loadError.value = false
  try {
    stats.value = await getStats()
    await nextTick()
    renderCharts()
  } catch (err) {
    loadError.value = true
    // 错误提示已由 request.ts 全局弹出
    console.error('首页数据加载失败', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
}

.dashboard-intro {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  padding: 4px 0 10px;
  border-bottom: 1px solid var(--line-strong);
}
.intro-eyebrow {
  margin: 0 0 6px;
  color: var(--moss);
  font-size: 12px;
  font-weight: 650;
}
.intro-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
}
.intro-copy {
  max-width: 32rem;
  margin: 0 0 3px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.75;
  text-align: right;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 22px 20px;
  box-shadow: var(--shadow-soft);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-hover);
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-index {
  position: absolute;
  top: 12px;
  right: 14px;
  color: #aab2ad;
  font-family: var(--font-data);
  font-size: 10px;
}
.stat-value {
  font-family: var(--font-data);
  font-size: 30px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}
.stat-label {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-card--wide {
  grid-column: span 2;
}
.chart-title {
  font-weight: 650;
  color: var(--ink);
  letter-spacing: 0;
}
.chart {
  height: 300px;
}

@media (max-width: 900px) {
  .dashboard-intro {
    align-items: start;
    flex-direction: column;
    gap: 8px;
  }
  .intro-copy {
    text-align: left;
  }
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .chart-card--wide {
    grid-column: span 1;
  }
}

@media (max-width: 520px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .intro-title {
    font-size: 25px;
  }
}
</style>
