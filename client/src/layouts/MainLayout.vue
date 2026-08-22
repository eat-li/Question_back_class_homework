<template>
  <el-container class="layout">
    <!-- 侧栏 -->
    <el-aside width="224px" class="aside">
      <div class="brand">
        <div class="brand-mark">∑</div>
        <div class="brand-text">
          <div class="brand-name">教师辅助</div>
          <div class="brand-sub">数学 · 备课小筑</div>
        </div>
      </div>

      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item index="/dashboard">首页</el-menu-item>
        <el-menu-item index="/students">学生管理</el-menu-item>
        <el-menu-item index="/questions">题库管理</el-menu-item>
        <el-menu-item index="/browse">题目浏览</el-menu-item>
        <el-menu-item index="/homeworks">作业管理</el-menu-item>
        <el-menu-item index="/backup">数据备份</el-menu-item>
        <el-menu-item index="/settings">系统设置</el-menu-item>
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
        <div class="header-title">{{ $route.meta.title }}</div>
        <div class="header-right">
          <span class="greet">老师好，</span>
          <span class="date">{{ today }}</span>
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
import { ref } from 'vue'
import QuickLinks from '../components/QuickLinks.vue'

const today = ref(
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
)
</script>

<style scoped>
.layout {
  height: 100vh;
}

/* —— 侧栏 —— */
.aside {
  background: var(--side);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 18px;
}
.brand-mark {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--moss);
  color: #fffdf9;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(107, 143, 113, 0.35);
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
  letter-spacing: 0.08em;
}

.menu {
  border-right: none;
  flex: 1;
  padding: 6px 0;
}
.menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  margin: 4px 12px;
  border-radius: 10px;
  padding-left: 20px !important;
  color: #6a6255;
  font-size: 14px;
  position: relative;
  transition: all 0.2s ease;
}
.menu :deep(.el-menu-item:hover) {
  background: #f6f0e3;
  color: var(--ink);
}
.menu :deep(.el-menu-item.is-active) {
  background: var(--moss-soft);
  color: var(--moss-deep);
  font-weight: 600;
}
.menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: var(--moss);
}

.aside-foot {
  padding: 18px 20px 22px;
}
.foot-line {
  height: 1px;
  background: var(--line);
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
  background: var(--paper);
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 253, 249, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--line);
  padding: 0 28px;
}
.header-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.03em;
}
.header-right {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--ink-soft);
  font-size: 13px;
}
.greet {
  font-family: var(--font-display);
  font-size: 14px;
  color: var(--moss-deep);
}

.main {
  padding: 24px 28px;
  overflow-y: auto;
}

/* —— 页面切换过渡 —— */
.page-enter-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
</style>
