# 网站视觉优化设计文档

> 目标：去掉 AI 味与 emoji，统一为 SVG 图标，统一暖色，增强交互动画。
> 原则：保留现有「柔和书卷」基调（暖杏纸张 + 苔绿主色 + 衬线标题）——这是特色，不是问题。

---

## 一、现状诊断

扫描全部页面后，发现三类问题：

### 1. 残留 emoji（AI 味的主要来源）
| 位置 | 现状 | 问题 |
| --- | --- | --- |
| `Dashboard.vue:57-60` 统计卡片 | 📝 👥 📚 ⭐ | 彩色 emoji，风格跳脱 |
| `SystemSettings.vue:8` 描述文字 | ✨ 按钮 | emoji 出现在正文 |

> 注：难度星号 `★`（`Dashboard.vue:106`、`QuestionBrowse.vue:19,45`）是数学教师语境下的难度符号，语义清晰、非彩色 emoji，**保留**。

### 2. 界面几乎无 SVG 图标
- 侧边栏菜单项（8 项）全是纯文字，无图标。
- 所有工具栏按钮（查询/新增/编辑/删除/发布/导出）全是纯文字。
- 这是「简陋感」的主要来源——按钮堆文字，缺乏识别度。

### 3. 颜色混入 Element Plus 默认冷灰
设计系统是暖色（暖墨 `#3d3a34`、苔绿 `#6b8f71`），但多处 scoped CSS 残留冷灰/蓝灰：

| 残留值 | 语义 | 应改为 |
| --- | --- | --- |
| `#909399` | 次级文字 | `var(--ink-soft)` |
| `#606266` / `#303133` | 标题/正文 | `var(--ink)` |
| `#ebeef5` | 分隔线 | `var(--line)` |
| `#f5f7fa` | 预览区底 | `var(--paper-deep)` |
| `rgba(0,0,0,.12)` | 纸张阴影 | 暖色阴影 token |

---

## 二、图标系统方案

**选用 `@element-plus/icons-vue`**（Element Plus 官方 SVG 图标库）：
- 与现有 Element Plus 组件同源，风格、笔画粗细统一；
- 纯 SVG，非 emoji 字体，缩放清晰；
- 按需引入，不增加打包体积压力。

### emoji → 图标映射表

| 位置 | 原 emoji | 新图标 | 理由 |
| --- | --- | --- | --- |
| 题目总数 | 📝 | `Document` | 文档 = 题目 |
| 学生人数 | 👥 | `User` | 单用户图标简洁 |
| 作业总数 | 📚 | `Notebook` | 笔记本 = 作业 |
| 成绩记录 | ⭐ | `Trophy` | 奖杯 = 成绩，避免与难度 ★ 混淆 |
| AI 排版 | ✨ | `MagicStick` | 魔法棒 = 智能排版 |

### 侧边栏菜单图标映射

| 菜单 | 图标 |
| --- | --- |
| 首页 | `House` |
| 学生管理 | `User` |
| 题库管理 | `Collection` |
| 题目浏览 | `Reading` |
| 作业管理 | `Document` |
| 查看作业 | `View` |
| 数据备份 | `FolderOpened` |
| 系统设置 | `Setting` |

### 常用按钮图标映射

| 动作 | 图标 |
| --- | --- |
| 新增/发布 | `Plus` |
| 查询/搜索 | `Search` |
| 编辑 | `Edit` |
| 删除 | `Delete` |
| 导出/下载 | `Download` |
| 返回 | `ArrowLeft` |

---

## 三、配色统一

在 `theme.css` 中补充语义化 token，并替换 scoped CSS 中的硬编码冷灰：

```css
--text-muted: #8a8375;   /* 复用 ink-soft */
--border-soft: #ece5d6;  /* 复用 el-border-color-light */
```

替换原则：凡次级文字一律 `var(--ink-soft)`，凡正文/标题一律 `var(--ink)`，凡分隔线一律 `var(--line)`，凡预览区底色一律 `var(--paper-deep)`。

---

## 四、布局与间距

- 统计卡片：图标容器从纯色块升级为「淡色底 + 图标」，图标与数字之间留白更均衡。
- 侧边栏菜单：加入图标后，文字与图标 `gap` 统一为 10px，保持左侧对齐线一致。
- 工具栏：按钮加图标后统一 `gap`，避免拥挤。

---

## 五、动画增强

在 `theme.css` 全局补齐交互反馈（GPU 友好的 transform/opacity）：

1. **按钮**：`el-button` 加 `transition`，hover 轻微上浮 `translateY(-1px)`，active 按压 `scale(0.98)`。
2. **菜单项**：已有 hover 背景，补充图标/文字同步的过渡。
3. **统计卡片**：hover 上浮 + 阴影加深（与知识点卡片一致）。
4. **焦点可见性**：统一 `focus-visible` 外圈，满足键盘导航可达性。

> 全部使用 `transform` / `opacity`，避免 `top/left/width/height` 动画造成的重排。

---

## 六、实施清单（按优先级）

| # | 任务 | 涉及文件 |
| --- | --- | --- |
| 1 | 安装并配置 `@element-plus/icons-vue` | `package.json`、`main.ts` |
| 2 | 侧边栏菜单加图标 + 品牌标记微调 | `MainLayout.vue` |
| 3 | 统计卡片 emoji → 图标 | `Dashboard.vue` |
| 4 | 各页面按钮加图标、替换 ✨ | 学生/题库/知识点/浏览/作业/备份/设置 |
| 5 | 配色统一 + 动画增强 | `theme.css` + 各 scoped CSS |
| 6 | 构建验证 | `pnpm build` |

---

## 七、验收标准

- [ ] 全站无彩色 emoji（📝👥📚⭐✨ 全部清除）。
- [ ] 侧边栏 8 个菜单项均有图标，active 态高亮清晰。
- [ ] 所有主操作按钮带图标，识别度提升。
- [ ] 无硬编码冷灰 `#909399` / `#606266` / `#303133`（导出打印样式除外）。
- [ ] 按钮/卡片 hover、active 反馈流畅。
- [ ] `pnpm build` 通过，无报错。
