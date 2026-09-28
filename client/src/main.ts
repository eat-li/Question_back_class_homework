import { createApp } from 'vue'
import 'katex/dist/katex.min.css'

// Element Plus 按需引入：仅注册用到的组件与样式，避免整包（~1MB JS + 全量 CSS）打包进首屏。
// 组件样式按需引入；自定义主题变量见文末 theme.css（必须在 Element Plus 之后引入，否则被覆盖）。
import {
  ElAside,
  ElAlert,
  ElButton,
  ElButtonGroup,
  ElCascader,
  ElCard,
  ElCheckbox,
  ElContainer,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElHeader,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElOption,
  ElPagination,
  ElRadio,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTree,
  ElTooltip
} from 'element-plus'

import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-alert.css'
import 'element-plus/theme-chalk/el-aside.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-button-group.css'
import 'element-plus/theme-chalk/el-card.css'
import 'element-plus/theme-chalk/el-checkbox.css'
import 'element-plus/theme-chalk/el-container.css'
import 'element-plus/theme-chalk/el-date-picker.css'
import 'element-plus/theme-chalk/el-descriptions.css'
import 'element-plus/theme-chalk/el-descriptions-item.css'
import 'element-plus/theme-chalk/el-dialog.css'
import 'element-plus/theme-chalk/el-drawer.css'
import 'element-plus/theme-chalk/el-dropdown.css'
import 'element-plus/theme-chalk/el-dropdown-menu.css'
import 'element-plus/theme-chalk/el-dropdown-item.css'
import 'element-plus/theme-chalk/el-empty.css'
import 'element-plus/theme-chalk/el-form.css'
import 'element-plus/theme-chalk/el-form-item.css'
import 'element-plus/theme-chalk/el-header.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-input-number.css'
import 'element-plus/theme-chalk/el-main.css'
import 'element-plus/theme-chalk/el-menu.css'
import 'element-plus/theme-chalk/el-menu-item.css'
import 'element-plus/theme-chalk/el-option.css'
import 'element-plus/theme-chalk/el-pagination.css'
import 'element-plus/theme-chalk/el-radio.css'
import 'element-plus/theme-chalk/el-radio-button.css'
import 'element-plus/theme-chalk/el-radio-group.css'
import 'element-plus/theme-chalk/el-select.css'
import 'element-plus/theme-chalk/el-slider.css'
import 'element-plus/theme-chalk/el-switch.css'
import 'element-plus/theme-chalk/el-tabs.css'
import 'element-plus/theme-chalk/el-tab-pane.css'
import 'element-plus/theme-chalk/el-table.css'
import 'element-plus/theme-chalk/el-table-column.css'
import 'element-plus/theme-chalk/el-tag.css'
import 'element-plus/theme-chalk/el-tooltip.css'
import 'element-plus/theme-chalk/el-tree.css'
import 'element-plus/theme-chalk/el-cascader.css'
import 'element-plus/theme-chalk/el-cascader-panel.css'
// 命令式调用组件的样式（ElMessage / ElMessageBox / ElLoading）
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-loading.css'
// 浮层基础设施样式：el-overlay 承载 dialog/drawer/message-box 的定位与层级，
// el-popper 承载 tooltip/select 下拉/popover 的定位与层级，缺一不可否则层级错乱。
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-popper.css'
import 'element-plus/theme-chalk/el-select-dropdown.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
// date-picker：el-date-picker.css 为空壳，实际样式拆分在 panel / time 文件中
import 'element-plus/theme-chalk/el-date-picker-panel.css'
import 'element-plus/theme-chalk/el-time-picker.css'
import 'element-plus/theme-chalk/el-time-select.css'

// 自定义主题变量必须放在所有 Element Plus 样式之后，否则会被 base.css 的默认变量覆盖，
// 导致按钮等组件回退成默认蓝。
import './styles/theme.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 全局注册用到的 Element Plus 组件（按 kebab-case 名称，匹配模板中的 <el-xxx>）
const components: Record<string, any> = {
  'el-alert': ElAlert,
  'el-aside': ElAside,
  'el-button': ElButton,
  'el-button-group': ElButtonGroup,
  'el-card': ElCard,
  'el-checkbox': ElCheckbox,
  'el-container': ElContainer,
  'el-date-picker': ElDatePicker,
  'el-descriptions': ElDescriptions,
  'el-descriptions-item': ElDescriptionsItem,
  'el-dialog': ElDialog,
  'el-drawer': ElDrawer,
  'el-dropdown': ElDropdown,
  'el-dropdown-item': ElDropdownItem,
  'el-dropdown-menu': ElDropdownMenu,
  'el-empty': ElEmpty,
  'el-form': ElForm,
  'el-form-item': ElFormItem,
  'el-header': ElHeader,
  'el-icon': ElIcon,
  'el-input': ElInput,
  'el-input-number': ElInputNumber,
  'el-main': ElMain,
  'el-menu': ElMenu,
  'el-menu-item': ElMenuItem,
  'el-option': ElOption,
  'el-pagination': ElPagination,
  'el-radio': ElRadio,
  'el-radio-button': ElRadioButton,
  'el-radio-group': ElRadioGroup,
  'el-select': ElSelect,
  'el-slider': ElSlider,
  'el-switch': ElSwitch,
  'el-table': ElTable,
  'el-table-column': ElTableColumn,
  'el-tab-pane': ElTabPane,
  'el-tabs': ElTabs,
  'el-tag': ElTag,
  'el-tooltip': ElTooltip,
  'el-tree': ElTree,
  'el-cascader': ElCascader
}
Object.entries(components).forEach(([name, comp]) => app.component(name, comp))

app.use(router)
app.mount('#app')
