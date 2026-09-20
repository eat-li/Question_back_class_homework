<template>
  <div class="analysis">
    <!-- 筛选器 -->
    <el-card class="filter-card">
      <div class="filters">
        <el-select
          v-model="fStudentId"
          placeholder="学生（选一人看趋势/雷达）"
          clearable
          filterable
          style="width: 220px"
          @change="load"
        >
          <el-option
            v-for="s in students"
            :key="s.id"
            :label="`${s.name}${s.grade ? '（' + s.grade + '）' : ''}`"
            :value="s.id"
          />
        </el-select>
        <el-select
          v-model="fExamType"
          placeholder="考试类型"
          clearable
          style="width: 140px"
          @change="load"
        >
          <el-option v-for="t in examTypes" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <el-date-picker
          v-model="fDateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 260px"
          @change="load"
        />
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
        <div class="toolbar-spacer"></div>
        <el-button :icon="Download" :disabled="!trendChart" @click="exportTrendPNG"
          >导出趋势图</el-button
        >
        <el-button :icon="Download" @click="exportCSV">导出数据 CSV</el-button>
      </div>
    </el-card>

    <el-empty v-if="!loading && !hasData" description="暂无成绩数据，请先在「成绩录入」中录入" />

    <div v-else class="chart-grid" v-loading="loading">
      <!-- 趋势折线图（单学生） -->
      <el-card v-if="summary.trend.length" class="chart-card chart-card--wide">
        <template #header>
          <span class="chart-title">成绩趋势</span>
          <span class="chart-sub">{{ trendStudentName }}</span>
        </template>
        <div ref="trendRef" class="chart chart--line"></div>
      </el-card>

      <!-- 班级对比柱状图 -->
      <el-card class="chart-card">
        <template #header><span class="chart-title">平均分对比</span></template>
        <div ref="compareRef" class="chart"></div>
      </el-card>

      <!-- 分数段饼图 -->
      <el-card class="chart-card">
        <template #header><span class="chart-title">分数段分布</span></template>
        <div ref="pieRef" class="chart"></div>
      </el-card>

      <!-- 家长反馈单 -->
      <el-card v-if="summary.trend.length" class="chart-card">
        <template #header><span class="chart-title">家长反馈单</span></template>
        <div class="feedback">
          <p class="feedback-summary">{{ feedbackSummary || '数据不足，无法生成小结' }}</p>
          <el-input
            v-model="feedbackComment"
            type="textarea"
            :rows="3"
            placeholder="教师评语（可选）"
          />
          <div class="feedback-actions">
            <el-button type="primary" :icon="Printer" @click="printFeedback"
              >打印 / 另存 PDF</el-button
            >
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Search, Download, Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getStudents } from '../../api/student'
import { getGrades, getGradeSummary } from '../../api/grade'
import { escapeHtml } from '../../utils/printHtml'
import { useECharts } from '../../composables/useECharts'
import type { GradeSummary, GradeTrendPoint, Student } from '../../types'

const examTypes = [
  { value: 'final', label: '期末' },
  { value: 'mid', label: '期中' },
  { value: 'quiz', label: '小测' },
  { value: 'popquiz', label: '随堂测验' }
]
const palette = ['#2f6658', '#a47732', '#b24c3d', '#6c7a58', '#58736a', '#8d6848']

const examTypeLabel = (t: string) => examTypes.find((x) => x.value === t)?.label || t

const students = ref<Student[]>([])
const summary = ref<GradeSummary>({ trend: [], radar: [], distribution: [], compare: [] })
const loading = ref(false)

const fStudentId = ref<number | undefined>()
const fExamType = ref('')
const fDateRange = ref<any>(null)

const feedbackComment = ref('')

const trendRef = ref<HTMLElement>()
const compareRef = ref<HTMLElement>()
const pieRef = ref<HTMLElement>()

const { init: initChart, resizeAll, disposeAll } = useECharts()
let trendChart: any = null

const hasData = computed(() => summary.value.compare.length > 0 || summary.value.trend.length > 0)
const trendStudentName = computed(() => {
  const s = students.value.find((x) => x.id === fStudentId.value)
  return s ? `${s.name} · 数学成绩走势` : ''
})

// 自动小结：按科目比较首末次，得出进步/退步/持平
const feedbackSummary = computed(() => {
  const trend = summary.value?.trend || []
  const parts: string[] = []
  for (const t of trend) {
    const pts = t.points || []
    if (pts.length < 1) continue
    const avg =
      Math.round(
        (pts.reduce((s: number, p: GradeTrendPoint) => s + p.percent, 0) / pts.length) * 10
      ) / 10
    if (pts.length < 2) {
      parts.push(`${t.subject} 目前仅 1 次记录，${pts[0].percent}%`)
      continue
    }
    const first = pts[0].percent
    const last = pts[pts.length - 1].percent
    const diff = Math.round((last - first) * 10) / 10
    const word = diff > 2 ? `提升 ${diff} 分` : diff < -2 ? `下降 ${Math.abs(diff)} 分` : '基本持平'
    parts.push(`${t.subject} 近 ${pts.length} 次平均 ${avg}%，最近 ${last}%，${word}`)
  }
  return parts.join('；') + (parts.length ? '。' : '')
})

const buildFilters = () => ({
  studentId: fStudentId.value || undefined,
  examType: fExamType.value || undefined,
  startDate: fDateRange.value?.[0] || undefined,
  endDate: fDateRange.value?.[1] || undefined
})

const renderTrend = () => {
  if (!trendRef.value || !summary.value.trend.length) return
  const labels: string[] = []
  const seriesMap = new Map<string, Map<string, GradeTrendPoint>>()
  for (const t of summary.value.trend) {
    const m = new Map<string, GradeTrendPoint>()
    for (const p of t.points) {
      if (!labels.includes(p.date)) labels.push(p.date)
      m.set(p.date, p)
    }
    seriesMap.set(t.subject, m)
  }
  labels.sort()

  // 收集全部百分制分数，用于纵轴自适应缩放 + 平均值参考线
  const allPercents: number[] = []
  const series = [...seriesMap.entries()].map(([subj, m], i) => ({
    name: subj,
    type: 'line',
    smooth: true,
    connectNulls: true,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { width: 3 },
    itemStyle: { color: palette[i % palette.length] },
    // 数据点直接标原始分（如 135/150），曲线仍用百分制保证可比
    label: {
      show: true,
      position: 'top',
      color: '#4a514d',
      fontSize: 11,
      formatter: (p: any) => {
        const d = p.data
        return d && d.value != null ? `${d.score}/${d.fullScore}` : ''
      }
    },
    labelLayout: { hideOverlap: true },
    data: labels.map((d) => {
      const pt = m.get(d)
      if (!pt) return null
      allPercents.push(pt.percent)
      return {
        value: pt.percent,
        score: pt.score,
        fullScore: pt.fullScore,
        date: pt.date,
        examType: pt.examType
      }
    })
  }))

  // 纵轴按数据自适应缩放：让 1~2 分的波动也能看清，但保底给一个最小跨度避免过度放大
  const rawMin = Math.min(...allPercents)
  const rawMax = Math.max(...allPercents)
  const span = rawMax - rawMin
  const pad = Math.max(6, span * 0.25)
  let yMin = Math.floor(Math.max(0, rawMin - pad))
  let yMax = Math.ceil(Math.min(100, rawMax + pad))
  if (yMax - yMin < 12) {
    const mid = (rawMin + rawMax) / 2
    yMin = Math.max(0, Math.floor(mid - 6))
    yMax = Math.ceil(mid + 6)
  }

  const avg = allPercents.length
    ? Math.round((allPercents.reduce((s, x) => s + x, 0) / allPercents.length) * 10) / 10
    : 0

  // 平均参考线（画在第一条曲线上）
  if (series[0]) {
    series[0].markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: { type: 'dashed', color: '#c2a878', width: 1.5 },
      label: {
        show: true,
        formatter: `平均 ${avg}`,
        position: 'insideEndTop',
        color: '#a8874a',
        fontSize: 11
      },
      data: [{ yAxis: avg }]
    }
  }
  // 单科目时叠加淡色面积，让走势更醒目
  if (series.length === 1) {
    series[0].areaStyle = { color: 'rgba(91, 125, 116, 0.12)' }
  }

  const chart = initChart(trendRef.value, {
    color: palette,
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || !params.length) return ''
        return params
          .map((p: any) => {
            const d = p.data
            if (!d || d.value == null) return `${p.marker} ${p.seriesName}：暂无`
            return `${p.marker} ${p.seriesName}：<b>${d.score} / ${d.fullScore}</b>（${d.value}%）`
          })
          .join('<br>')
      }
    },
    legend: { top: 0, icon: 'circle' },
    grid: { left: 44, right: 24, top: 48, bottom: 36 },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#dde5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#7d8681' }
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      axisLabel: { color: '#7d8681', formatter: '{value}' },
      splitLine: { lineStyle: { color: '#eaf0ed' } }
    },
    series
  })
  trendChart = chart
}

const renderCompare = () => {
  if (!compareRef.value) return
  const data = summary.value.compare || []
  const chart = initChart(compareRef.value, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 44, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map((d: any) => d.name),
      axisLine: { lineStyle: { color: '#dde5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#4a514d', interval: 0, rotate: data.length > 8 ? 30 : 0 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#7d8681' },
      splitLine: { lineStyle: { color: '#eaf0ed' } }
    },
    series: [
      {
        type: 'bar',
        data: data.map((d: any) => d.avgPercent),
        barWidth: '52%',
        itemStyle: { color: '#5b7d74', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', color: '#7d8681', fontSize: 11 }
      }
    ]
  })
}

const renderPie = () => {
  if (!pieRef.value) return
  const data = (summary.value.distribution || [])
    .filter((d: any) => d.count > 0)
    .map((d: any) => ({ name: d.label, value: d.count }))
  const chart = initChart(pieRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人次 ({d}%)' },
    legend: { bottom: 0, icon: 'circle' },
    color: ['#2f6658', '#6c7a58', '#a47732', '#b24c3d'],
    series: [
      {
        type: 'pie',
        radius: ['40%', '64%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fbfdfc', borderWidth: 2 },
        label: { formatter: '{b}\n{c} 人次', fontSize: 12, color: '#3a403d' },
        data
      }
    ]
  })
}

const renderAll = () => {
  disposeAll()
  trendChart = null
  renderTrend()
  renderCompare()
  renderPie()
}

const handleResize = resizeAll

// 请求序号：筛选多次快速触发时只采纳最新一次响应，丢弃过期结果
let loadSeq = 0
const load = async () => {
  const seq = ++loadSeq
  loading.value = true
  try {
    const data = await getGradeSummary(buildFilters())
    if (seq !== loadSeq) return // 已有更新的请求，丢弃本次响应
    summary.value = data
    await nextTick()
    renderAll()
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

// 导出趋势图为高清 PNG
const exportTrendPNG = () => {
  if (!trendChart) return ElMessage.warning('当前没有趋势图可导出')
  const url = trendChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = `成绩趋势-${trendStudentName.value || '学生'}-${Date.now()}.png`
  a.click()
}

// 导出原始数据为 CSV（带 BOM，Excel 可直接打开）
const exportCSV = async () => {
  const rows = await getGrades(buildFilters())
  if (!rows.length) return ElMessage.warning('没有可导出的数据')

  const esc = (v: any) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const header = ['学生', '科目', '考试类型', '考试日期', '得分', '满分', '百分比', '备注']
  const lines = [header.join(',')]
  for (const r of rows) {
    const pct = r.fullScore > 0 ? Math.round((r.score / r.fullScore) * 100) : 0
    lines.push(
      [
        r.student?.name,
        r.subject,
        examTypeLabel(r.examType),
        r.examDate,
        r.score,
        r.fullScore,
        pct + '%',
        r.comment
      ]
        .map(esc)
        .join(',')
    )
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `成绩数据-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// 家长反馈单：趋势图 + 小结 + 评语，打印另存 PDF
const printFeedback = () => {
  const student = students.value.find((s) => s.id === fStudentId.value)
  const name = escapeHtml(student?.name || '学生')
  const img = trendChart
    ? trendChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    : ''
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>家长反馈单</title>
<style>
  body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#222;padding:32px;max-width:760px;margin:0 auto;}
  h1{font-size:22px;border-bottom:2px solid #333;padding-bottom:12px;}
  .meta{color:#666;font-size:13px;margin:8px 0 16px;}
  .img{max-width:100%;}
  .section{margin:20px 0;}
  .section h2{font-size:16px;margin-bottom:8px;}
  .summary{line-height:1.7;}
  .comment{border:1px solid #ccc;border-radius:6px;padding:12px;min-height:60px;line-height:1.7;white-space:pre-wrap;}
  .foot{margin-top:28px;color:#999;font-size:12px;}
</style></head><body>
<h1>学生成绩反馈单</h1>
<div class="meta">学生：${name} ｜ 日期：${new Date().toLocaleDateString('zh-CN')}</div>
${img ? `<img class="img" src="${img}" />` : ''}
<div class="section"><h2>学习小结</h2><div class="summary">${escapeHtml(feedbackSummary.value || '暂无数据')}</div></div>
<div class="section"><h2>教师评语</h2><div class="comment">${escapeHtml(feedbackComment.value || '——').replace(/\n/g, '<br>')}</div></div>
<div class="foot">本反馈单由教师辅助系统生成，仅供家长参考。</div>
</body></html>`
  const win = window.open('', '_blank', 'width=820,height=900')
  if (!win) return ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

onMounted(async () => {
  students.value = await getStudents()
  load()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeAll()
})
</script>

<style scoped>
.analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filter-card {
  margin-bottom: 0;
}
.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.toolbar-spacer {
  flex: 1;
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
.chart-sub {
  margin-left: 12px;
  font-size: 13px;
  color: var(--ink-soft);
}
.chart {
  height: 300px;
}
.chart--line {
  height: 340px;
}
.feedback {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feedback-summary {
  margin: 0;
  line-height: 1.8;
  color: var(--ink);
  font-size: 14px;
  background: var(--moss-soft);
  border-radius: 8px;
  padding: 12px 14px;
}
.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .chart-card--wide {
    grid-column: span 1;
  }
}
</style>
