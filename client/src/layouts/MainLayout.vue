<template>
  <el-container class="layout">
    <!-- 侧栏 -->
    <div v-if="navOpen" class="nav-scrim" aria-hidden="true" @click="navOpen = false"></div>
    <el-aside
      :width="navRailed ? '72px' : '232px'"
      class="aside"
      :class="{ 'aside--open': navOpen, 'aside--collapsed': navRailed }"
    >
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">∑</div>
        <div class="brand-text">
          <div class="brand-name">教师辅助</div>
          <div class="brand-sub">数学教学工作台</div>
        </div>
      </div>

      <el-menu
        router
        :default-active="$route.path"
        class="menu"
        :collapse="navRailed"
        :collapse-transition="false"
        popper-effect="light"
        popper-class="nav-tip"
      >
        <!-- 标题放在 #title 插槽：Element Plus 只在提供该插槽时，才在收起态
             hover 显示菜单名的浮层提示（标题必须是 menu-item 直接子级 span 才会被收起态隐藏） -->
        <el-menu-item v-for="item in navItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title
            ><span>{{ item.label }}</span></template
          >
        </el-menu-item>
      </el-menu>

      <QuickLinks v-show="!navRailed" />

      <div class="aside-foot">
        <div class="foot-line"></div>
        <div class="foot-text">认真教书 · 温柔生活</div>
      </div>
    </el-aside>

    <el-container class="body">
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-heading">
          <el-button
            class="nav-collapse"
            text
            circle
            :aria-label="navCollapsed ? '展开导航' : '收起导航'"
            @click="toggleNav"
          >
            <el-icon><component :is="navCollapsed ? Expand : Fold" /></el-icon>
          </el-button>
          <el-button class="nav-trigger" text circle aria-label="打开导航" @click="navOpen = true">
            <el-icon><Menu /></el-icon>
          </el-button>
          <div>
            <div class="header-kicker">教学工作台</div>
            <div class="header-title">{{ $route.meta.title }}</div>
          </div>
        </div>
        <div class="header-right">
          <span class="greet">老师好</span>
          <span class="header-dot" aria-hidden="true"></span>
          <span class="date">{{ today }}</span>
          <el-button link type="danger" @click="logout">退出登录</el-button>
        </div>
      </el-header>

      <!-- 内容 -->
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="page">
            <component :is="Component" :key="$route.path" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { shallowRef, ref, computed, markRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  House,
  User,
  Collection,
  Reading,
  Document,
  Notebook,
  View,
  DocumentAdd,
  TrendCharts,
  FolderOpened,
  Setting,
  Memo,
  Files,
  List,
  Menu,
  Fold,
  Expand
} from '@element-plus/icons-vue'
import QuickLinks from '../components/QuickLinks.vue'
import { TOKEN_KEY } from '../api/request'

const router = useRouter()
const route = useRoute()
const navOpen = shallowRef(false)
// 侧栏收起（仅桌面端生效）：状态持久化，刷新后保持
const NAV_COLLAPSED_KEY = 'nav-collapsed'
const navCollapsed = ref(localStorage.getItem(NAV_COLLAPSED_KEY) === '1')
// 移动端抽屉打开时必须展开显示完整菜单，故收起态仅在抽屉关闭时生效
const navRailed = computed(() => navCollapsed.value && !navOpen.value)
const toggleNav = () => {
  navCollapsed.value = !navCollapsed.value
  localStorage.setItem(NAV_COLLAPSED_KEY, navCollapsed.value ? '1' : '0')
}

// 菜单配置：收起态 hover 时用 label 作为浮层提示（见模板注释）
const navItems = [
  { path: '/dashboard', label: '首页', icon: markRaw(House) },
  { path: '/students', label: '学生管理', icon: markRaw(User) },
  { path: '/questions', label: '题库管理', icon: markRaw(Collection) },
  { path: '/browse', label: '题目浏览', icon: markRaw(Reading) },
  { path: '/conclusions', label: '发布结论', icon: markRaw(Memo) },
  { path: '/conclusions/list', label: '结论列表', icon: markRaw(List) },
  { path: '/handouts', label: '发布讲义', icon: markRaw(Files) },
  { path: '/handouts/list', label: '讲义列表', icon: markRaw(List) },
  { path: '/homeworks', label: '作业管理', icon: markRaw(Document) },
  { path: '/summaries', label: '课时总结', icon: markRaw(Notebook) },
  { path: '/homework-view', label: '查看作业', icon: markRaw(View) },
  { path: '/grades', label: '成绩录入', icon: markRaw(DocumentAdd) },
  { path: '/grade-analysis', label: '成绩分析', icon: markRaw(TrendCharts) },
  { path: '/backup', label: '数据备份', icon: markRaw(FolderOpened) },
  { path: '/settings', label: '系统设置', icon: markRaw(Setting) }
]
const today = shallowRef(
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
)

watch(
  () => route.path,
  () => {
    navOpen.value = false
  }
)

const logout = () => {
  localStorage.removeItem(TOKEN_KEY)
  router.push('/login')
}
</script>

<style scoped>
/* 固定视口高度的三段式布局：侧栏与顶栏不动，只有 .main 内容区滚动。
   （此前是 min-height:100dvh，内容变高会把整个页面撑开，侧栏被一起滚走） */
.layout {
  height: 100%;
  overflow: hidden;
}

/* —— 玻璃侧栏：悬浮的一块磨砂玻璃，不再压深色底 —— */
.aside {
  margin: 14px 0 14px 14px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 覆盖 Element Plus 默认的 overflow:auto，避免侧栏内出现滚动条 */
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow-soft);
  transition: width var(--dur) var(--ease);
}

/* —— 收起态：只留图标窄条 —— */
.aside--collapsed .brand {
  padding: 15px 10px;
  justify-content: center;
}
.aside--collapsed .brand-text,
.aside--collapsed .foot-text {
  display: none;
}
.aside--collapsed .menu {
  padding: 12px 4px;
}
.aside--collapsed .aside-foot {
  padding: 16px 8px 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 17px 18px;
  border-bottom: 1px solid var(--hair);
}
.brand-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.92), rgba(238, 240, 240, 0.5));
  box-shadow:
    var(--lit-top),
    var(--lit-deep),
    0 6px 14px -8px rgba(24, 30, 36, 0.42);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.04em;
}
.brand-sub {
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 3px;
  letter-spacing: 0.06em;
}

.menu {
  border-right: none;
  flex: 1;
  min-height: 0; /* 菜单项过多时在侧栏内部滚动，不撑高整页 */
  padding: 12px 10px;
  overflow-y: auto;
}
.menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 0;
  border-radius: var(--radius-sm);
  color: var(--ink-regular);
  font-size: 14px;
  position: relative;
  transition:
    background-color var(--dur) var(--ease),
    color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}
/* 展开态左侧留白；收起态交给 Element Plus collapse 的默认内边距，让图标居中 */
.menu:not(.el-menu--collapse) :deep(.el-menu-item) {
  padding-left: 16px !important;
}
.menu.el-menu--collapse :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu :deep(.el-menu-item .el-icon) {
  margin-right: 10px;
  font-size: 16px;
}
/* 收起态文字被隐藏，图标的右边距会让图标偏移，置零并放大一点保证视觉居中 */
.menu.el-menu--collapse :deep(.el-menu-item .el-icon) {
  margin-right: 0;
  font-size: 18px;
}
/* EP 的浮层触发容器按 24px 图标预留 20px 内边距，我们的图标更小会偏左，
   这里清掉内边距、改为居中排布 */
.menu.el-menu--collapse :deep(.el-menu-item .el-menu-tooltip__trigger) {
  padding: 0;
  justify-content: center;
}
.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.62);
  color: var(--ink);
}
/* 当前项＝一块被顶起来的实心玻璃，左缘用琥珀金细条标记 */
.menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(246, 246, 243, 0.7));
  color: var(--ink);
  font-weight: 600;
  box-shadow:
    var(--lit-top),
    var(--lit-deep),
    0 6px 14px -9px rgba(24, 30, 36, 0.42);
}
.menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2.5px;
  height: 20px;
  border-radius: 2px;
  background: var(--moss);
}

.aside-foot {
  padding: 18px 20px 22px;
}
.foot-line {
  height: 1px;
  background: var(--hair);
  margin-bottom: 12px;
}
.foot-text {
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0.12em;
  text-align: center;
}

/* —— 主体 —— */
.body {
  height: 100%;
  min-height: 0; /* 关键：允许 flex 子项收缩，内部 .main 才能独立滚动 */
  background: transparent;
}

/* —— 玻璃顶栏：与侧栏同一材质，浮在地面之上 —— */
.header {
  flex-shrink: 0;
  height: 68px;
  margin: 14px 18px 0 14px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  background-color: transparent;
  background-image: linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg));
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--edge);
  box-shadow: var(--shadow-soft);
  position: relative;
  z-index: 5;
}
.header-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-kicker {
  margin-bottom: 1px;
  color: var(--ink-soft);
  font-size: 11px;
  letter-spacing: 0.28em;
}
.header-title {
  font-family: var(--font-display);
  font-size: 21px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.05em;
  line-height: 1.2;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.greet {
  font-size: 13.5px;
  color: var(--moss-deep);
  font-weight: 600;
}
.header-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--line-strong);
}

.main {
  min-height: 0;
  padding: 20px 18px 34px 14px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-trigger,
.nav-scrim {
  display: none;
}

/* 桌面端：收起/展开按钮常显 */
.nav-collapse {
  display: inline-flex;
}

/* 收起态 hover 提示浮层：Element Plus 默认深色气泡与整体玻璃质感不搭，
   这里改为暖白实底 + 细边 + 同款圆角阴影（浮层被 teleport 到 body，需 :global） */
:global(.el-popper.nav-tip) {
  padding: 7px 11px;
  border-radius: var(--radius-sm);
  border-color: var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  font-size: 13px;
  letter-spacing: 0.02em;
}
:global(.el-popper.nav-tip .el-popper__arrow::before) {
  background: var(--surface);
  border-color: var(--line-strong);
}

/* —— 页面切换过渡 —— */
.page-enter-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 820px) {
  .aside {
    position: fixed;
    inset: 14px auto 14px 14px;
    z-index: 20;
    margin: 0;
    transform: translateX(calc(-100% - 20px));
    transition: transform var(--dur) var(--ease);
  }
  .aside--open {
    transform: translateX(0);
  }
  .nav-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 19;
    background: rgba(26, 32, 38, 0.26);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }
  .nav-trigger {
    display: inline-flex;
  }
  /* 移动端抽屉里不显示收起按钮（收起是桌面端能力） */
  .nav-collapse {
    display: none;
  }
  .header {
    height: 62px;
    margin: 12px 12px 0;
    padding: 0 14px;
  }
  .header-kicker,
  .greet,
  .header-dot {
    display: none;
  }
  .header-right {
    gap: 4px;
  }
  .date {
    display: none;
  }
  .main {
    padding: 16px 12px 28px;
  }
}
</style>
