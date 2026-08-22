import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '首页' }
        },
        {
          path: 'students',
          name: 'students',
          component: () => import('../views/student/StudentList.vue'),
          meta: { title: '学生管理' }
        },
        {
          path: 'questions',
          name: 'questions',
          component: () => import('../views/question/QuestionBank.vue'),
          meta: { title: '题库管理' }
        },
        {
          path: 'browse',
          name: 'browse',
          component: () => import('../views/question/QuestionBrowse.vue'),
          meta: { title: '题目浏览' }
        },
        {
          path: 'homeworks',
          name: 'homeworks',
          component: () => import('../views/homework/HomeworkList.vue'),
          meta: { title: '作业管理' }
        },
        {
          path: 'backup',
          name: 'backup',
          component: () => import('../views/system/DataBackup.vue'),
          meta: { title: '数据备份' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/system/SystemSettings.vue'),
          meta: { title: '系统设置' }
        }
      ]
    }
  ]
})

export default router
