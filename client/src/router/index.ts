import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登录' }
    },
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
          path: 'questions/knowledge/:tag',
          name: 'knowledgeQuestions',
          component: () => import('../views/question/KnowledgeQuestions.vue'),
          meta: { title: '知识点题目' }
        },
        {
          path: 'browse',
          name: 'browse',
          component: () => import('../views/question/QuestionBrowse.vue'),
          meta: { title: '题目浏览' }
        },
        {
          path: 'conclusions',
          name: 'conclusions',
          component: () => import('../views/conclusion/ConclusionList.vue'),
          meta: { title: '结论' }
        },
        {
          path: 'conclusions/categories',
          name: 'conclusionCategories',
          component: () => import('../views/conclusion/CategoryManage.vue'),
          meta: { title: '分类管理' }
        },
        {
          path: 'conclusions/edit/:id?',
          name: 'conclusionEdit',
          component: () => import('../views/conclusion/ConclusionEdit.vue'),
          meta: { title: '结论编辑' }
        },
        {
          path: 'homeworks',
          name: 'homeworks',
          component: () => import('../views/homework/HomeworkList.vue'),
          meta: { title: '作业管理' }
        },
        {
          path: 'homework-view',
          name: 'homeworkView',
          component: () => import('../views/homework/HomeworkView.vue'),
          meta: { title: '查看作业' }
        },
        {
          path: 'grades',
          name: 'grades',
          component: () => import('../views/grade/GradeInput.vue'),
          meta: { title: '成绩录入' }
        },
        {
          path: 'grade-analysis',
          name: 'gradeAnalysis',
          component: () => import('../views/grade/GradeAnalysis.vue'),
          meta: { title: '成绩分析' }
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

// 登录守卫：未登录只能访问 /login；携带来源路径，登录后回跳
router.beforeEach((to) => {
  const token = localStorage.getItem('admin-token')
  if (to.path !== '/login' && !token) {
    return { path: '/login', query: to.path === '/' ? {} : { redirect: to.fullPath } }
  }
  if (to.path === '/login' && token) return '/'
  return true
})

export default router
