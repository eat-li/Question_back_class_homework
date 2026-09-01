<template>
  <div class="quick-links">
    <div class="ql-head">
      <span class="ql-title">常用链接</span>
      <button class="ql-add" type="button" title="添加链接" @click="openAdd">
        <el-icon :size="13"><Plus /></el-icon>
      </button>
    </div>

    <div v-if="!links.length" class="ql-empty">暂无收藏</div>

    <div v-for="(l, i) in links" :key="i" class="ql-item">
      <a class="ql-name" :href="l.url" target="_blank" rel="noopener" :title="l.url">{{
        l.name
      }}</a>
      <button class="ql-del" type="button" title="删除" @click="remove(i)">
        <el-icon :size="13"><Close /></el-icon>
      </button>
    </div>

    <el-dialog v-model="dialogVisible" title="添加常用链接" width="380px" append-to-body>
      <el-form label-width="60px">
        <el-form-item label="名称"
          ><el-input v-model="form.name" placeholder="如：学科网"
        /></el-form-item>
        <el-form-item label="网址"
          ><el-input v-model="form.url" placeholder="https://…" @keyup.enter="save"
        /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const STORAGE_KEY = 'common-links'

// 从 localStorage 读取已收藏的常用链接
function loadLinks(): { name: string; url: string }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((l) => l && l.name && l.url) : []
  } catch {
    return []
  }
}

const links = ref<{ name: string; url: string }[]>(loadLinks())
const dialogVisible = ref(false)
const form = reactive({ name: '', url: '' })

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links.value))
}

const openAdd = () => {
  form.name = ''
  form.url = ''
  dialogVisible.value = true
}

const save = () => {
  const name = form.name.trim()
  let url = form.url.trim()
  if (!name || !url) {
    ElMessage.warning('请填写名称和网址')
    return
  }
  // 自动补全协议，避免被当成站内相对路径
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  links.value.push({ name, url })
  persist()
  dialogVisible.value = false
}

const remove = (i: number) => {
  links.value.splice(i, 1)
  persist()
}
</script>

<style scoped>
.quick-links {
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  max-height: 220px;
  overflow-y: auto;
}
.ql-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.ql-title {
  font-size: 12px;
  color: var(--ink-soft);
  letter-spacing: 0.08em;
}
.ql-add {
  width: 20px;
  height: 20px;
  border: 1px solid var(--line);
  background: transparent;
  border-radius: 6px;
  color: var(--moss-deep);
  cursor: pointer;
  line-height: 1;
  font-size: 15px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ql-add:hover {
  background: var(--moss-soft);
}
.ql-empty {
  font-size: 12px;
  color: var(--ink-soft);
  opacity: 0.6;
}
.ql-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 0;
}
.ql-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ql-name:hover {
  color: var(--moss-deep);
}
.ql-del {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: #b6bfba;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  border-radius: 4px;
  flex-shrink: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ql-del:hover {
  color: #c0392b;
  background: #fbeae8;
}
</style>
