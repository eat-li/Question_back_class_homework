<template>
  <div class="login-page">
    <el-card class="login-card">
      <div class="login-title">教师辅助系统</div>
      <div class="login-sub">管理员登录</div>
      <el-form :model="form" label-width="0" @submit.prevent="submit">
        <el-form-item>
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            autocomplete="current-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth'
import { TOKEN_KEY } from '../api/request'

const router = useRouter()
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
    router.push('/')
  } catch {
    // 错误提示已由 request.ts 统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
}
.login-card {
  width: 380px;
  padding: 12px 8px;
}
.login-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  color: var(--ink);
}
.login-sub {
  text-align: center;
  color: var(--ink-soft);
  font-size: 14px;
  margin: 8px 0 24px;
}
.login-btn {
  width: 100%;
}
</style>
