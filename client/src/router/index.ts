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
          // 结论主入口 = 发布/编辑页（与「发布讲义」保持一致的用法）
          path: 'conclusions',
          name: 'conclusionPublish',
          component: () => import('../views/conclusion/ConclusionEdit.vue'),
          meta: { title: '发布结论' }
        },
        {
          // 只读浏览：卡片里直接渲染结论正文
          path: 'conclusions/list',
          name: 'conclusionList',
          component: () => import('../views/conclusion/ConclusionList.vue'),
          meta: { title: '结论列表' }
        },
        {
          path: 'conclusions/categories',
          name: 'conclusionCategories',
          component: () => import('../views/conclusion/CategoryManage.vue'),
          meta: { title: '分类管理' }
        },
        {
          // 编辑指定结论（列表里的「编辑」按钮走这里）
          path: 'conclusions/edit/:id?',
          name: 'conclusionEdit',
          component: () => import('../views/conclusion/ConclusionEdit.vue'),
          meta: { title: '编辑结论' }
        },
        {
          path: 'handouts',
          name: 'handouts',
          component: () => import('../views/handout/HandoutBuilder.vue'),
          meta: { title: '发布讲义' }
        },
        {
          path: 'handouts/list',
          name: 'handoutList',
          component: () => import('../views/handout/HandoutList.vue'),
          meta: { title: '讲义列表' }
        },
        {
          path: 'homeworks',
          name: 'homeworks',
          component: () => import('../views/homework/HomeworkList.vue'),
          meta: { title: '作业管理' }
        },
        {
          path: 'summaries',
          name: 'summaries',
          component: () => import('../views/homework/SummaryList.vue'),
          meta: { title: '课时总结' }
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

// 浏览器标签页标题随路由同步（多标签时便于区分）
router.afterEach((to) => {
  let page = to.meta.title ? String(to.meta.title) : ''
  // 知识点题目页：标题带上具体知识点名
  if (to.name === 'knowledgeQuestions' && to.params.tag) {
    const tag = String(to.params.tag)
    page = (tag === '__empty__' ? '未分类' : tag) + ' · 题目'
  }
  document.title = page ? `${page} - 教师辅助` : '教师辅助'
})

export default router
