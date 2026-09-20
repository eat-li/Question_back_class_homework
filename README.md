# 教师辅助系统

面向数学教师的本地优先综合管理后台，包含学生管理、题库管理、作业管理、成绩分析、结论管理等模块。

## 功能概览

- 学生管理：增删改查、导入导出
- 题库管理：题目录入/编辑/检索、知识点分组统计
- 作业管理：发布作业、选题、导出 PDF、录入成绩
- 成绩管理：成绩录入、批量导入、趋势/对比/分数段分析
- 结论管理：知识点结论的编辑、发布、导出 PDF
- 数据备份：全量备份 ZIP、恢复备份
- 系统设置：AI 智能排版配置
- 管理员登录：所有后台接口均需登录后访问

## 技术栈

| 层       | 技术                                                        |
| -------- | ----------------------------------------------------------- |
| 前端     | Vue 3 + TypeScript + Vite + Element Plus + ECharts + Tiptap |
| 后端     | Node.js + Express + Sequelize + MySQL                       |
| 包管理   | pnpm workspace                                              |
| 图片存储 | 阿里云 OSS（可选）                                          |

## 目录结构

```text
sqrt/
├── client/                 # Web 管理后台前端
│   └── src/
│       ├── api/            # 接口封装
│       ├── components/     # 公共组件
│       ├── composables/    # 组合式函数
│       ├── layouts/        # 布局
│       ├── router/         # 路由
│       ├── styles/         # 主题样式
│       ├── types/          # TypeScript 类型
│       ├── utils/          # 工具函数
│       └── views/          # 页面
├── server/                 # 后端服务
│   ├── migrations/         # 数据库迁移
│   ├── src/
│   │   ├── config/         # 数据库/OSS 配置
│   │   ├── controllers/    # 业务控制器
│   │   ├── middlewares/    # 中间件（认证/错误处理等）
│   │   ├── models/         # Sequelize 模型
│   │   ├── routes/         # 路由
│   │   └── utils/          # 工具
│   └── test/               # 自动化测试
├── wxapp/                  # 家长端小程序预留模板
└── docs/                   # 设计/规划文档
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm
- MySQL 5.7+ / 8.x

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置后端环境变量

复制环境变量示例：

```bash
cp server/.env.example server/.env
```

至少需要配置：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASS=your_password
```

管理员登录配置：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=你自己设置的密码
AUTH_SECRET=一段随机字符串
```

### 3. 启动开发环境

```bash
pnpm dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3000

也可以分别启动：

```bash
pnpm dev:client
pnpm dev:server
```

### 4. 登录系统

启动后访问前端会自动跳转到登录页，使用 `.env` 中配置的管理员账号登录。

## 常用脚本

| 命令                | 说明            |
| ------------------- | --------------- |
| `pnpm dev`          | 同时启动前后端  |
| `pnpm build`        | 构建前端        |
| `pnpm lint`         | ESLint 检查     |
| `pnpm format`       | Prettier 格式化 |
| `pnpm format:check` | 检查格式        |
| `pnpm test`         | 运行自动化测试  |

## 数据库迁移

项目使用轻量迁移机制：

- 启动时自动执行 `server/migrations` 下未执行过的迁移
- 迁移记录保存在 `migrations` 表
- 以后修改表结构请新增迁移文件，不要依赖自动 `alter`

## 数据备份与恢复

- 在「数据备份」页面可以下载全量备份 ZIP
- 备份包含：学生、题目、作业、成绩、分类、结论、关联表等
- 也可以选择备份 ZIP 进行恢复
- 恢复按主键插入或更新，不会删除备份中不存在的数据

## 管理员认证说明

- 除登录接口外，所有业务接口都需要 `Authorization: Bearer <token>`
- Token 默认有效期 7 天
- 前端登录后自动携带 Token
- Token 失效会自动跳转到登录页
- 生产环境必须配置非默认 `AUTH_SECRET`，否则后端会拒绝启动

## 安全与性能配置

- `AI_ALLOWED_BASE_URLS` 用于限制 AI 排版接口可访问的 OpenAI 兼容服务地址，避免后端被当作任意请求代理。
- `DEFAULT_LIST_LIMIT` 用于限制未传分页参数的列表接口最大返回量，默认 1000。
- `CACHE_MAX_ENTRIES` 用于限制进程内缓存条目数量，默认 200。
- `DB_POOL_*` 可按部署机器调整数据库连接池大小与超时时间。

## 家长端预留

`wxapp` 目录是未来家长端小程序的预留模板，当前未启用。

后续如果需要家长查看成绩/作业，可以基于该模板开发，并新增独立的家长只读接口，不要复用管理员 Token。

## 相关文档

- [项目规划](docs/PLANNING.md)
- [项目优化建议](docs/项目优化建议.md)
- [视觉优化设计](docs/design-optimization.md)
- [二级结论发布与管理设计](docs/二级结论发布与管理_设计文档.md)
- [学生成绩记录与可视化分析](docs/学生成绩记录与可视化_分析文档.md)
