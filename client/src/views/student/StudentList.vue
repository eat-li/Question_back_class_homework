<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="按姓名搜索"
        clearable
        style="width: 200px"
        @keyup.enter="search"
        @clear="search"
      />
      <el-select v-model="grade" placeholder="年级" clearable style="width: 140px" @change="search">
        <el-option v-for="g in gradeOptions" :key="g" :label="g" :value="g" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="search">查询</el-button>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增学生</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="grade" label="年级" />
      <el-table-column prop="contact" label="联系方式" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="load"
      />
    </div>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑学生' : '新增学生'" width="480px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="姓名" required><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="年级">
        <el-select v-model="form.grade" filterable placeholder="选择年级" style="width: 100%">
          <el-option v-for="g in gradeOptions" :key="g" :label="g" :value="g" />
        </el-select>
      </el-form-item>
      <el-form-item label="联系方式"><el-input v-model="form.contact" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../api/student'
import type { Student } from '../../types'

// 年级预设选项（小学一年级 ~ 高三）
const gradeOptions = [
  '小学一年级',
  '小学二年级',
  '小学三年级',
  '小学四年级',
  '小学五年级',
  '小学六年级',
  '初一',
  '初二',
  '初三',
  '高一',
  '高二',
  '高三'
]

const list = ref<Student[]>([])
const loading = ref(false)
const keyword = ref('')
const grade = ref('')
const dialogVisible = ref(false)
const form = reactive<any>({})
const saving = ref(false)

// 分页
const page = ref(1)
const pageSize = 20
const total = ref(0)

const load = async () => {
  loading.value = true
  try {
    const res = await getStudents({
      keyword: keyword.value,
      grade: grade.value,
      page: page.value,
      pageSize
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const search = () => {
  page.value = 1
  load()
}

const openDialog = (row?: any) => {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, row)
  dialogVisible.value = true
}

const save = async () => {
  if (saving.value) return
  if (!form.name || !String(form.name).trim()) {
    ElMessage.warning('请填写姓名')
    return
  }
  saving.value = true
  try {
    if (form.id) await updateStudent(form.id, form)
    else await createStudent(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('保存失败', err)
  } finally {
    saving.value = false
  }
}

const remove = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除学生「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return // 用户取消
  }
  try {
    await deleteStudent(row.id)
    ElMessage.success('删除成功')
    // 删除末页最后一条时回退页码，避免停留在空白页
    if (page.value > 1 && list.value.length <= 1) page.value -= 1
    load()
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('删除失败', err)
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
