// ECharts 公共封装：统一初始化、自适应、销毁，避免页面重复样板代码。
// 按需注册（Pie/Bar/Line + Title/Tooltip/Legend/Grid + Canvas）抽到 utils/echarts.ts，
// 与「插入图表」对话框共用同一份实例，避免重复 use。
import echarts from '../utils/echarts'
import { onBeforeUnmount } from 'vue'

export function useECharts() {
  const charts: ReturnType<typeof echarts.init>[] = []

  const init = (el: HTMLElement, option: any) => {
    const chart = echarts.init(el)
    chart.setOption(option)
    charts.push(chart)
    return chart
  }

  const resizeAll = () => charts.forEach((c) => c.resize())

  const disposeAll = () => {
    charts.forEach((c) => c.dispose())
    charts.length = 0
  }

  onBeforeUnmount(disposeAll)

  return { init, resizeAll, disposeAll, charts }
}
