<template>
  <div class="settings">
    <el-card class="block">
      <template #header>
        <div class="block-title">AI 智能排版</div>
      </template>
      <p class="desc">
        在这里配置一次大模型的 API Key，之后编辑题目时点编辑器工具栏的 ✨ 按钮即可一键排版，无需每次填写。
        支持 OpenAI / DeepSeek / 通义千问 / Kimi 等任意 OpenAI 兼容接口。
      </p>
      <el-form label-width="100px" style="max-width: 560px">
        <el-form-item label="API Key">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="填写你的 API Key" />
        </el-form-item>
        <el-form-item label="接口地址">
          <el-select
            v-model="form.baseUrl"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="选择或输入接口地址"
          >
            <el-option label="OpenAI（默认）" value="https://api.openai.com/v1" />
            <el-option label="DeepSeek" value="https://api.deepseek.com/v1" />
            <el-option label="通义千问" value="https://dashscope.aliyuncs.com/compatible-mode/v1" />
            <el-option label="Kimi" value="https://api.moonshot.cn/v1" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型">
          <el-input v-model="form.model" placeholder="如 gpt-4o-mini / deepseek-chat" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存配置</el-button>
          <el-button @click="reset">清空</el-button>
        </el-form-item>
      </el-form>
      <p class="hint">配置仅保存在本机浏览器（localStorage），不会上传到服务器。</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { loadAiConfig, saveAiConfig, clearAiConfig } from '../../utils/aiConfig'

const form = reactive({ apiKey: '', baseUrl: '', model: '' })

onMounted(() => {
  Object.assign(form, loadAiConfig())
})

const save = () => {
  if (!form.apiKey.trim()) {
    ElMessage.warning('请填写 API Key')
    return
  }
  saveAiConfig({ apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim(), model: form.model.trim() })
  ElMessage.success('配置已保存')
}

const reset = () => {
  form.apiKey = ''
  form.baseUrl = ''
  form.model = ''
  clearAiConfig()
  ElMessage.success('已清空配置')
}
</script>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 760px;
}
.block :deep(.el-card__header) {
  padding: 16px 22px;
}
.block-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.desc {
  margin: 0 0 16px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.8;
}
.hint {
  margin: 12px 0 0;
  color: var(--ink-soft);
  font-size: 12px;
  opacity: 0.7;
}
</style>
