// ECharts 公共封装：统一注册组件、初始化、自适应、销毁，避免页面重复样板代码
import * as echarts from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { onBeforeUnmount } from 'vue'

echarts.use([
  PieChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

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
