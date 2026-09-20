<template>
  <div class="login-page">
    <!-- 备课草稿纸氛围：数学符号水印（纯装饰，不参与交互/朗读） -->
    <div class="login-art" aria-hidden="true">
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g font-family="Georgia, 'Times New Roman', 'Songti SC', serif">
          <text x="96" y="214" font-size="150" fill="rgba(91,125,116,0.14)">∫</text>
          <text x="1190" y="168" font-size="122" fill="rgba(91,125,116,0.12)">∑</text>
          <text x="1178" y="806" font-size="152" fill="rgba(91,125,116,0.12)">π</text>
          <text x="92" y="788" font-size="124" fill="rgba(91,125,116,0.13)">√</text>
          <text x="622" y="158" font-size="92" fill="rgba(91,125,116,0.11)">x²</text>
          <text x="556" y="836" font-size="84" fill="rgba(91,125,116,0.11)">½</text>
          <text x="352" y="430" font-size="84" fill="rgba(91,125,116,0.11)">f(x)</text>
        </g>
        <g fill="none" stroke="rgba(91,125,116,0.16)" stroke-linecap="round">
          <!-- 抛物线 + 坐标轴 -->
          <path d="M 1060 430 Q 1140 250 1280 398" stroke-width="2" />
          <path d="M 1076 430 Q 1140 300 1260 398" stroke-width="1" opacity="0.7" />
          <path d="M 1030 480 H 1300" stroke-width="1.5" opacity="0.7" />
          <path d="M 1060 300 V 540" stroke-width="1.5" opacity="0.7" />
          <!-- 正弦波 -->
          <path
            d="M 300 626 q 45 -70 90 0 q 45 70 90 0 q 45 -70 90 0 q 45 70 90 0 q 45 -70 90 0"
            stroke-width="2"
          />
          <!-- 圆弧 -->
          <path d="M 196 660 a 44 44 0 1 1 0.01 0" stroke-width="1.5" opacity="0.8" />
          <path d="M 196 660 m -20 0 a 64 64 0 1 1 40 0" stroke-width="1.5" opacity="0.8" />
        </g>
      </svg>
    </div>

    <div class="login-wrap">
      <el-card class="login-card">
        <div class="login-brand">
          <div class="login-mark">∑</div>
          <div class="login-heading">
            <div class="login-title">教师辅助系统</div>
            <div class="login-sub">数学 · 备课小筑</div>
          </div>
        </div>

        <div class="login-rule"></div>

        <div class="login-tip">管理员登录</div>

        <el-form :model="form" label-width="0" @submit.prevent="submit">
          <el-form-item>
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
              :prefix-icon="User"
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              autocomplete="current-password"
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="submit"
          >
            登 录
          </el-button>
        </el-form>

        <div class="login-foot">认真教书 · 温柔生活</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '../api/auth'
import { TOKEN_KEY } from '../api/request'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

const submit = async () => {
  if (!form.username.trim() || !form.password) {
    return
  }
  loading.value = true
  try {
    const res = await login({ username: form.username.trim(), password: form.password })
    localStorage.setItem(TOKEN_KEY, res.token)
    // 回跳登录前所在页面（如 401 被踢 / 未登录直接访问），避免操作现场丢失
    const redirect = route.query.redirect ? String(route.query.redirect) : ''
    const target =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
    router.replace(target)
  } catch {
    // 错误提示已由 request.ts 统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  overflow: hidden;
}

/* 田字格纹理（草稿纸感） */
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(91, 125, 116, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 125, 116, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.72;
  pointer-events: none;
}

.login-art {
  position: absolute;
  inset: 0;
  color: var(--moss);
  pointer-events: none;
}
.login-art svg {
  width: 100%;
  height: 100%;
  display: block;
}

.login-wrap {
  position: relative;
  z-index: 1;
  padding: 24px;
}

.login-card {
  width: 400px;
  padding: 26px 12px 20px;
  border-top: 3px solid var(--moss-deep);
  animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .login-card {
    animation: none;
  }
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}
.login-mark {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--moss-deep);
  color: #fffdf9;
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(36, 72, 63, 0.22);
}
.login-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0;
}
.login-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0;
}

.login-rule {
  height: 1px;
  background: var(--line);
  margin: 20px 0 18px;
}

.login-tip {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--ink-soft);
  letter-spacing: 0;
  margin-bottom: 14px;
  text-align: center;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-indent: 0.3em;
}

.login-foot {
  margin-top: 20px;
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0.12em;
  text-align: center;
  opacity: 0.85;
}

@media (max-width: 480px) {
  .login-card {
    width: 100%;
  }
}
</style>
