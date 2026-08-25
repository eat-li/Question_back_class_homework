# 个人教师辅助系统 — 目标规划与项目结构

> 文档版本：v2.0 ｜ 编订日期：2026-08-22 ｜ 性质：开发规划
> 系统定位：**面向教师个人使用的「本地优先」Web 应用**

---

## 1. 系统定位

为独立教师提供一体化的教学辅助工具。本期聚焦**「学生 → 题库 → 作业」**核心闭环，其余能力按需扩展。

- **本地优先**：前端本机运行，数据持久化到远程 MySQL，可随时导出备份。
- **单一使用者**：仅教师本人使用，无多用户/权限体系，学生仅为被管理的数据。
- **简单可扩展**：按模块垂直切分、分层清晰，新增模块只需加一组「model + route + controller + 页面」。

---

## 2. 功能模块

### 本期实现（核心 3 模块）

| 模块               | 目标                                                |
| ------------------ | --------------------------------------------------- |
| **学生管理**       | 学生增删改查、班级归类、关键词检索、备注维护        |
| **题库管理**       | 题目录入/编辑/检索、题型与难度标签、参考答案与解析  |
| **作业发布与批改** | 选题组卷、发布作业、学生提交、客观题判分 + 人工批改 |

### 后续扩展（目录已预留，暂不实现）

- 图形绘制（三维几何体 / 二维曲线）— 预留 `figures` 模型与 `/api/drawing` 路由位
- 个性化学习安排 — 预留 `plans` 模型
- 个人设置与数据备份 — 预留 `settings` 模型
- 图片存储（阿里云 OSS）— 题目配图/附件，预留 `ossService`

---

## 3. 技术栈

| 层       | 选型                                                                  |
| -------- | --------------------------------------------------------------------- |
| 前端     | Vue 3 + TypeScript + Element Plus + Vite + Pinia + Vue Router + Axios |
| 后端     | Express + Sequelize + mysql2                                          |
| 数据库   | MySQL（`mysql2.sqlpub.com:3307` / 库 `webback_study`）                |
| 包管理器 | pnpm（monorepo workspace）                                            |
| 图片存储 | 阿里云 OSS（预留，本期不接）                                          |

> ⚠️ 数据库密码、OSS AccessKey 属敏感凭据，统一放 `server/.env`（已加入 `.gitignore`），勿提交仓库。

---

## 4. 项目目录结构

```
sqrt/
├── pnpm-workspace.yaml
├── package.json                 # 根脚本（统一启动/构建）
├── .gitignore
├── docs/PLANNING.md
│
├── client/                      # 前端 Vue 3 + Element Plus
│   └── src/
│       ├── main.ts / App.vue
│       ├── router/index.ts      # 路由（按模块分组）
│       ├── api/                 # 接口封装（与后端模块对应）
│       │   ├── request.ts       #   axios 统一封装
│       │   ├── student.ts
│       │   ├── question.ts
│       │   └── homework.ts
│       ├── layouts/MainLayout.vue   # 侧边栏布局
│       └── views/               # 页面（按模块分目录）
│           ├── student/StudentList.vue
│           ├── question/QuestionBank.vue
│           └── homework/HomeworkList.vue
│
└── server/                      # 后端 Express + Sequelize
    ├── .env / .env.example
    └── src/
        ├── index.js             # 入口
        ├── app.js               # Express 装配
        ├── config/db.js         # Sequelize 连接
        ├── models/              # 模型（含 index.js 注册与关联）
        │   ├── Student.js  Question.js  Homework.js  Submission.js
        ├── routes/              # 路由
        │   ├── index.js
        │   ├── student.routes.js  question.routes.js  homework.routes.js
        ├── controllers/         # 业务逻辑
        │   ├── student.controller.js  question.controller.js  homework.controller.js
        ├── middlewares/errorHandler.js
        └── utils/response.js    # 统一响应包络
```

**扩展方式**：新增一个模块时，在 `server/models`、`server/routes`、`server/controllers` 各加一个文件，在 `routes/index.js` 挂载；前端在 `api/`、`views/` 各加对应目录即可。

---

## 5. 数据库表设计（MySQL + Sequelize）

> Sequelize 统一 `underscored: true`（字段 camelCase → 列 snake_case），自动维护 `created_at` / `updated_at`。

| 表名          | 关键字段                                                                       | 说明                            |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| `students`    | name, student_no(唯一), class_name, contact, remark                            | 学生档案                        |
| `questions`   | title, type, difficulty, knowledge_tag, body, options(JSON), answer, analysis  | 题库（type: choice/fill/solve） |
| `homeworks`   | title, question_ids(JSON), class_names(JSON), start_at, end_at, status, remark | 作业                            |
| `submissions` | homework_id(FK), student_id(FK), answer(JSON), score, status, feedback         | 提交/批改                       |

**关联**：`homeworks 1—* submissions`，`students 1—* submissions`（在 `models/index.js` 建立）。

---

## 6. 里程碑

| 阶段    | 内容                                          | 验收                          |
| ------- | --------------------------------------------- | ----------------------------- |
| M0 地基 | monorepo 骨架、前后端连通、Sequelize 同步建表 | 健康检查接口通、四表建成      |
| M1 学生 | 学生 CRUD + 检索                              | 增删改查、关键词检索可用      |
| M2 题库 | 题目 CRUD + 检索                              | 录入/编辑/检索可用            |
| M3 作业 | 组卷发布 + 提交批改                           | 端到端「选题→发布→提交→判分」 |
| M4 收尾 | 联调、备份导出                                | 可交付本地运行                |
