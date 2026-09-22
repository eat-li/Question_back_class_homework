<template>
  <div class="backup">
    <!-- 备份题目与作业 -->
    <el-card class="block">
      <template #header>
        <div class="block-title">备份题目与作业</div>
      </template>
      <p class="desc">
        把全部数据（学生、题目、作业、成绩、知识点分类、结论、课时总结）打包成一个压缩包下载。建议定期下载并存到
        U 盘或网盘，电脑出问题时可以据此恢复。
      </p>
      <el-button type="primary" :icon="Download" :loading="backupLoading" @click="downloadBackup">
        下载备份压缩包
      </el-button>
    </el-card>

    <!-- 整包恢复 -->
    <el-card class="block">
      <template #header>
        <div class="block-title">恢复备份</div>
      </template>
      <p class="desc">
        选择之前下载的备份 ZIP，系统会按依赖顺序恢复全部数据。注意：恢复会按主键 id
        插入或更新已有记录，请确认当前数据可被覆盖。
      </p>
      <el-button type="warning" :icon="Upload" :loading="restoring" @click="triggerRestore">
        选择备份 ZIP 并恢复
      </el-button>
      <input
        ref="restoreInput"
        type="file"
        accept=".zip,application/zip"
        hidden
        @change="onRestoreFile"
      />
    </el-card>

    <!-- 学生信息导出与导入 -->
    <el-card class="block">
      <template #header>
        <div class="block-title">学生信息</div>
      </template>
      <p class="desc">
        把学生名单导出为 JSON
        文件；下次（或换电脑后）直接导入即可恢复。导入时按「姓名」判断，已存在的学生会被更新。
      </p>
      <div class="actions">
        <el-button :icon="Download" :loading="exporting" @click="downloadStudents"
          >导出学生 JSON</el-button
        >
        <el-button type="primary" :icon="Upload" :loading="importing" @click="triggerImport"
          >导入学生 JSON</el-button
        >
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { importStudents } from '../../api/student'
import { restoreBackup } from '../../api/backup'
import { downloadFile } from '../../api/request'

const backupLoading = ref(false)
const exporting = ref(false)
const importing = ref(false)
const restoring = ref(false)
const fileInput = ref<HTMLInputElement>()
const restoreInput = ref<HTMLInputElement>()

const downloadBackup = async () => {
  backupLoading.value = true
  try {
    // 必须带登录 Token 请求（<a href> 直链不会携带，会被后端 401 拒绝）
    await downloadFile('/backup', `backup-${Date.now()}.zip`)
  } catch {
    // 401 跳登录；其它错误已在 downloadFile 内提示
  } finally {
    backupLoading.value = false
  }
}

const downloadStudents = async () => {
  exporting.value = true
  try {
    await downloadFile('/students/export', `students-${Date.now()}.json`)
  } catch {
    // 401 跳登录；其它错误已在 downloadFile 内提示
  } finally {
    exporting.value = false
  }
}

const triggerRestore = () => restoreInput.value?.click()

const onRestoreFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  // 高危覆盖写操作：先二次确认，再执行
  try {
    await ElMessageBox.confirm(
      `确定用「${file.name}」恢复数据？恢复会按主键插入或更新现有记录，可能覆盖当前数据。`,
      '恢复备份确认',
      { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
    )
  } catch {
    input.value = ''
    return
  }
  restoring.value = true
  try {
    const res = await restoreBackup(file)
    ElMessage.success(`恢复完成：${Object.values(res).reduce((a, b) => a + b, 0)} 条数据已写入`)
  } catch (err: any) {
    // API 错误已由 request.ts 全局提示；这里只兜底非 API 错误
    if (!err?.isApiError) ElMessage.error('恢复失败：' + (err?.message || '备份文件格式有误'))
  } finally {
    restoring.value = false
    input.value = ''
  }
}

const triggerImport = () => fileInput.value?.click()

const onImportFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  // 会按姓名更新已有学生，先二次确认
  try {
    await ElMessageBox.confirm(
      `确定导入「${file.name}」？已存在的学生将按「姓名」被更新。`,
      '导入学生确认',
      { type: 'warning', confirmButtonText: '确认导入', cancelButtonText: '取消' }
    )
  } catch {
    input.value = ''
    return
  }
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
    if (!err?.isApiError) ElMessage.error('导入失败：' + (err?.message || '文件格式有误'))
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
