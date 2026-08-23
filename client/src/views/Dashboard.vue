<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="c in statCards" :key="c.label" class="stat-card">
        <div class="stat-icon" :style="{ background: c.bg, color: c.color }">
          <el-icon :size="22"><component :is="c.icon" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ c.value }}</div>
          <div class="stat-label">{{ c.label }}</div>
        </div>
      </div>
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
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const stats = ref<any>(null)
const typeRef = ref<HTMLElement>()
const difficultyRef = ref<HTMLElement>()
const knowledgeRef = ref<HTMLElement>()

let charts: ReturnType<typeof echarts.init>[] = []

const typeLabel = (t: string) =>
  ({ choice: '选择题', fill: '填空题', solve: '解答题' } as Record<string, string>)[t] || t

const statCards = computed(() => {
  const c = stats.value?.counts || {}
  return [
    { label: '题目总数', value: c.questionCount ?? 0, icon: Document, bg: '#e3ece9', color: '#46645c' },
    { label: '学生人数', value: c.studentCount ?? 0, icon: User, bg: '#f3eddf', color: '#a8874a' },
    { label: '作业总数', value: c.homeworkCount ?? 0, icon: Notebook, bg: '#e9edf3', color: '#5b6b82' },
    { label: '成绩记录', value: c.submissionCount ?? 0, icon: Trophy, bg: '#f3e9e4', color: '#a06a5a' }
  ]
})

const renderOne = (el: HTMLElement, option: any) => {
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
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
    color: ['#5b7d74', '#c2a878', '#8a9bb0'],
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

const handleResize = () => charts.forEach((c) => c.resize())

const load = async () => {
  stats.value = await getStats()
  await nextTick()
  renderCharts()
}

onMounted(() => {
  load()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach((c) => c.dispose())
  charts = []
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fffdf9;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-value {
  font-family: var(--font-display);
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
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.chart {
  height: 300px;
}

@media (max-width: 900px) {
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
</style>
