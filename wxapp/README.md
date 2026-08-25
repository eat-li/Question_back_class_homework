# 教师辅助家长端（预留）

> 当前状态：**预留模板，未启用**
> 技术栈：uni-app（Vue 3）

## 说明

这个目录是给未来「家长端」预留的小程序/H5 模板。

后期如果需要让家长查看：

- 学生成绩
- 作业情况
- 题库展示

可以基于这个目录开发，并新增独立的家长只读接口，例如：

```text
POST /api/auth/parent-login
GET  /api/parent/students/:studentId/grades
GET  /api/parent/students/:studentId/homeworks
```

## 当前内容

- 默认启动页已改为「家长端建设中」占位页
- 尚未接入任何真实业务接口

## 开发提示

- 家长端不要复用管理员的 `admin-token`
- 应使用单独的 `parent-token`，只能访问只读接口
