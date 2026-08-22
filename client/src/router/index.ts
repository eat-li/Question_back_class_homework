import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/students',
      children: [
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
          path: 'homeworks',
          name: 'homeworks',
          component: () => import('../views/homework/HomeworkList.vue'),
          meta: { title: '作业管理' }
        }
      ]
    }
  ]
})

export default router
