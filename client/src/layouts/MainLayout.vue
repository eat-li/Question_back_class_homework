<template>
  <el-container class="layout">
    <!-- 侧栏 -->
    <div v-if="navOpen" class="nav-scrim" aria-hidden="true" @click="navOpen = false"></div>
    <el-aside width="232px" class="aside" :class="{ 'aside--open': navOpen }">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">∑</div>
        <div class="brand-text">
          <div class="brand-name">教师辅助</div>
          <div class="brand-sub">数学教学工作台</div>
        </div>
      </div>

      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item index="/dashboard"
          ><el-icon><House /></el-icon><span>首页</span></el-menu-item
        >
        <el-menu-item index="/students"
          ><el-icon><User /></el-icon><span>学生管理</span></el-menu-item
        >
        <el-menu-item index="/questions"
          ><el-icon><Collection /></el-icon><span>题库管理</span></el-menu-item
        >
        <el-menu-item index="/browse"
          ><el-icon><Reading /></el-icon><span>题目浏览</span></el-menu-item
        >
        <el-menu-item index="/conclusions"
          ><el-icon><Memo /></el-icon><span>结论</span></el-menu-item
        >
        <el-menu-item index="/homeworks"
          ><el-icon><Document /></el-icon><span>作业管理</span></el-menu-item
        >
        <el-menu-item index="/summaries"
          ><el-icon><Notebook /></el-icon><span>课时总结</span></el-menu-item
        >
        <el-menu-item index="/homework-view"
          ><el-icon><View /></el-icon><span>查看作业</span></el-menu-item
        >
        <el-menu-item index="/grades"
          ><el-icon><DocumentAdd /></el-icon><span>成绩录入</span></el-menu-item
        >
        <el-menu-item index="/grade-analysis"
          ><el-icon><TrendCharts /></el-icon><span>成绩分析</span></el-menu-item
        >
        <el-menu-item index="/backup"
          ><el-icon><FolderOpened /></el-icon><span>数据备份</span></el-menu-item
        >
        <el-menu-item index="/settings"
          ><el-icon><Setting /></el-icon><span>系统设置</span></el-menu-item
        >
      </el-menu>

      <QuickLinks />

      <div class="aside-foot">
        <div class="foot-line"></div>
        <div class="foot-text">认真教书 · 温柔生活</div>
      </div>
    </el-aside>

    <el-container class="body">
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-heading">
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
import { shallowRef, watch } from 'vue'
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
  Menu
} from '@element-plus/icons-vue'
import QuickLinks from '../components/QuickLinks.vue'
import { TOKEN_KEY } from '../api/request'

const router = useRouter()
const route = useRoute()
const navOpen = shallowRef(false)
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

/* —— 侧栏 —— */
.aside {
  height: 100%;
  position: sticky;
  top: 0;
  background: var(--side);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 17px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #f5f8f6;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0;
}
.brand-sub {
  font-size: 11px;
  color: rgba(238, 246, 241, 0.55);
  margin-top: 3px;
  letter-spacing: 0;
}

.menu {
  border-right: none;
  flex: 1;
  min-height: 0; /* 菜单项过多时在侧栏内部滚动，不撑高整页 */
  padding: 12px 0;
  overflow-y: auto;
}
.menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 2px 10px;
  border-radius: 4px;
  padding-left: 18px !important;
  color: rgba(242, 247, 244, 0.7);
  font-size: 14px;
  position: relative;
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}
.menu :deep(.el-menu-item .el-icon) {
  margin-right: 10px;
  font-size: 16px;
}
.menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}
.menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
}
.menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: 0 2px 2px 0;
  background: #d5b36b;
}

.aside-foot {
  padding: 18px 20px 22px;
}
.foot-line {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}
.foot-text {
  font-family: var(--font-display);
  font-size: 12px;
  color: rgba(238, 246, 241, 0.5);
  letter-spacing: 0;
  text-align: center;
}

/* —— 主体 —— */
.body {
  height: 100%;
  min-height: 0; /* 关键：允许 flex 子项收缩，内部 .main 才能独立滚动 */
  background: var(--paper);
}

.header {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(252, 253, 251, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  padding: 0 32px;
  position: relative;
  z-index: 5;
}
.header-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-kicker {
  margin-bottom: 2px;
  color: var(--ink-soft);
  font-size: 11px;
}
.header-title {
  font-size: 19px;
  font-weight: 650;
  color: var(--ink);
  letter-spacing: 0;
}
.header-right {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.greet {
  font-size: 14px;
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
  padding: 28px 32px 40px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-trigger,
.nav-scrim {
  display: none;
}

/* —— 页面切换过渡 —— */
.page-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 820px) {
  .aside {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 20;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
  }
  .aside--open {
    transform: translateX(0);
  }
  .nav-scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 19;
    background: rgba(18, 29, 25, 0.42);
  }
  .nav-trigger {
    display: inline-flex;
  }
  .header {
    height: 68px;
    padding: 0 18px;
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
    padding: 20px 16px 32px;
  }
}
</style>
