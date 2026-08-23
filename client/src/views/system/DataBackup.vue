<template>
  <div class="backup">
    <!-- 备份题目与作业 -->
    <el-card class="block">
      <template #header>
        <div class="block-title">备份题目与作业</div>
      </template>
      <p class="desc">
        把全部题目、作业、学生名单和成绩打包成一个压缩包下载。建议定期下载并存到 U 盘或网盘，电脑出问题时可以据此恢复。
      </p>
      <el-button type="primary" :icon="Download" :loading="backupLoading" @click="downloadBackup">
        下载备份压缩包
      </el-button>
    </el-card>

    <!-- 学生信息导出与导入 -->
    <el-card class="block">
      <template #header>
        <div class="block-title">学生信息</div>
      </template>
      <p class="desc">
        把学生名单导出为 JSON 文件；下次（或换电脑后）直接导入即可恢复。导入时按「姓名」判断，已存在的学生会被更新。
      </p>
      <div class="actions">
        <el-button :icon="Download" @click="downloadStudents">导出学生 JSON</el-button>
        <el-button type="primary" :icon="Upload" :loading="importing" @click="triggerImport">导入学生 JSON</el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          hidden
          @change="onImportFile"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { importStudents } from '../../api/student'

const backupLoading = ref(false)
const importing = ref(false)
const fileInput = ref<HTMLInputElement>()

// 通过隐藏 a 标签触发浏览器下载（后端返回 Content-Disposition: attachment）
const download = (url: string) => {
  const a = document.createElement('a')
  a.href = url
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const downloadBackup = () => {
  backupLoading.value = true
  download('/api/backup')
  setTimeout(() => (backupLoading.value = false), 800)
}

const downloadStudents = () => download('/api/students/export')

const triggerImport = () => fileInput.value?.click()

const onImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    let data = JSON.parse(text)
    // 兼容纯数组或 { students: [...] } 等包装结构
    if (!Array.isArray(data)) data = data.students || data.data || []
    if (!data.length) {
      ElMessage.warning('文件里没有学生数据')
      return
    }
    const res = await importStudents(data)
    ElMessage.success(
      `导入完成：新增 ${res.created} 名，更新 ${res.updated} 名${res.failed ? `，跳过 ${res.failed} 条` : ''}`
    )
  } catch (err: any) {
    ElMessage.error('导入失败：' + (err?.message || '文件格式有误'))
  } finally {
    importing.value = false
    input.value = ''
  }
}
</script>

<style scoped>
.backup {
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
.actions {
  display: flex;
  gap: 10px;
}
</style>
