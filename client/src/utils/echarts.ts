// ECharts 按需注册：统一在这里 use 一次，页面与「插入图表」对话框共用同一份实例，
// 避免各处重复注册（重复 use 会让组件注册表被反复写入，也容易漏注册导致图表空白）。
import * as echarts from 'echarts/core'
import { PieChart, BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

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

export default echarts
