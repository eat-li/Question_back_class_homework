<template>
  <el-card>
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="按姓名搜索"
        clearable
        style="width: 200px"
        @keyup.enter="load"
      />
      <el-button type="primary" @click="load">查询</el-button>
      <el-button type="primary" @click="openDialog()">新增学生</el-button>
    </div>

    <el-table :data="list" border stripe v-loading="loading">
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="studentNo" label="学号" />
      <el-table-column prop="className" label="班级" />
      <el-table-column prop="contact" label="联系方式" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑学生' : '新增学生'" width="480px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="学号"><el-input v-model="form.studentNo" /></el-form-item>
      <el-form-item label="班级"><el-input v-model="form.className" /></el-form-item>
      <el-form-item label="联系方式"><el-input v-model="form.contact" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../api/student'

const list = ref([])
const loading = ref(false)
const keyword = ref('')
const dialogVisible = ref(false)
const form = reactive<any>({})

const load = async () => {
  loading.value = true
  try {
    list.value = await getStudents({ keyword: keyword.value })
  } finally {
    loading.value = false
  }
}

const openDialog = (row?: any) => {
  Object.keys(form).forEach((k) => delete form[k])
  if (row) Object.assign(form, row)
  dialogVisible.value = true
}

const save = async () => {
  if (form.id) await updateStudent(form.id, form)
  else await createStudent(form)
  ElMessage.success('保存成功')
  dialogVisible.value = false
  load()
}

const remove = async (row: any) => {
  await ElMessageBox.confirm(`确定删除学生「${row.name}」？`, '提示', { type: 'warning' })
  await deleteStudent(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
</style>
