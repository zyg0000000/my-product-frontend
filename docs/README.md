# AgentWorks 文档中心

> **统一的文档导航系统** - 快速找到你需要的文档

**最后更新**：2024-11-22

---

## 🚀 快速导航

### 刚加入团队？从这里开始：
1. [开发者指南](DEVELOPER_GUIDE.md) - 环境搭建、开发流程
2. [样式规范](STYLE_GUIDE.md) - UI 开发必读
3. [组件库手册](COMPONENT_LIBRARY.md) - 学习 Pro Components

### 正在开发新功能？
1. [UI 迁移计划](UI_MIGRATION_PLAN.md) - 了解 UI 技术栈
2. [组件库手册](COMPONENT_LIBRARY.md) - ProTable/ProForm 使用
3. [测试清单](UI_TESTING_CHECKLIST.md) - 确保质量

### 遇到问题？
1. [故障排查手册](TROUBLESHOOTING.md) - 常见问题解决
2. [FAQ](FAQ.md) - 常见疑问

---

## 📚 文档分类

### 🎨 UI 开发文档（★ 核心）

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [UI 迁移计划](UI_MIGRATION_PLAN.md) | 了解为什么迁移到 Pro + Tailwind | ⭐⭐⭐⭐⭐ |
| [样式规范指南](STYLE_GUIDE.md) | 字体、间距、颜色、布局标准 | ⭐⭐⭐⭐⭐ |
| [组件库手册](COMPONENT_LIBRARY.md) | ProTable/ProForm 完整使用指南 | ⭐⭐⭐⭐⭐ |
| [UI 测试清单](UI_TESTING_CHECKLIST.md) | 页面迁移质量保证 | ⭐⭐⭐⭐ |

### 📖 开发指南

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [开发者指南](DEVELOPER_GUIDE.md) | 环境搭建、工作流程、代码规范 | ⭐⭐⭐⭐⭐ |
| [故障排查手册](TROUBLESHOOTING.md) | 常见问题快速解决 | ⭐⭐⭐⭐ |
| [代码质量报告](CODE_QUALITY_REPORT.md) | 代码质量分析和建议 | ⭐⭐⭐ |

### 🏗️ 架构文档

| 文档 | 用途 | 优先级 |
|------|------|--------|
| [架构升级指南](architecture/ARCHITECTURE_UPGRADE_GUIDE.md) | 系统架构演进历史 | ⭐⭐⭐ |
| [页面模块化策略](architecture/PAGE_MODULARIZATION_STRATEGY.md) | 页面拆分和复用 | ⭐⭐⭐ |

### 📝 功能开发文档

| 文档 | 用途 | 状态 |
|------|------|------|
| [客户管理 - 开发进度](customer-management/PROGRESS.md) | 客户管理模块进度 | 🚧 进行中 |
| [客户管理 - 实施方案](customer-management/IMPLEMENTATION_PLAN.md) | 需求分析和设计 | ✅ 已完成 |
| [达人表现功能](features/TALENT_PERFORMANCE_IMPLEMENTATION.md) | 达人表现页面实现 | ✅ 已完成 |

### 🗂️ 归档文档

| 文档 | 说明 |
|------|------|
| [archive/](archive/) | 历史文档归档（已过时，仅供参考） |

---

## 🎯 按场景查找文档

### 我要开发新的列表页面
```
1. 阅读：组件库手册 - ProTable 章节
2. 参考：src/pages/Customers/CustomerList/CustomerList.tsx
3. 检查：UI 测试清单
```

### 我要开发新的表单页面
```
1. 阅读：组件库手册 - ProForm 章节
2. 参考：src/pages/Customers/CustomerForm.tsx
3. 检查：样式规范指南 - 表单规范
```

### 我要迁移旧页面到新 UI 方案
```
1. 阅读：UI 迁移计划
2. 参考：客户管理开发进度
3. 使用：UI 测试清单
```

### 我遇到了样式问题
```
1. 查看：样式规范指南
2. 对比：src/pages/Customers/ 示例代码
3. 搜索：故障排查手册
```

---

## 📊 文档状态

| 状态 | 文档数量 | 说明 |
|------|---------|------|
| ✅ 最新 | 8 | UI相关、开发指南、客户管理 |
| 🚧 更新中 | 2 | 正在迁移的功能文档 |
| 📦 归档 | 15+ | archive/ 目录，仅供参考 |

---

## 🔄 文档维护

### 更新频率
- **UI 文档**：每次 UI 方案调整时更新
- **功能文档**：每个功能模块完成时更新
- **开发指南**：每季度 Review 一次

### 文档负责人
- UI 相关：开发团队
- 架构相关：技术负责人
- 功能相关：对应模块负责人

### 文档 Review 计划
- [ ] 2024-12 月底：全面 Review
- [ ] 2025-03 月：季度 Review
- [ ] 每次大版本发布：更新所有文档

---

## 📝 贡献指南

### 如何更新文档？

1. **修改文档**
   ```bash
   # 编辑对应的 .md 文件
   vim docs/STYLE_GUIDE.md
   ```

2. **提交更新**
   ```bash
   git add docs/
   git commit -m "docs: 更新样式规范"
   git push
   ```

3. **Review**
   - 文档更新需要 Code Review
   - 确保信息准确、格式统一

### 文档编写规范

- 使用 Markdown 格式
- 添加目录（超过 3 个章节）
- 使用代码块标注语言
- 添加表格对比信息
- 包含示例代码
- 注明最后更新日期

---

## 🔗 外部链接

### 官方文档
- [Ant Design Pro](https://pro.ant.design/)
- [ProComponents](https://procomponents.ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

### 社区资源
- [Ant Design Pro GitHub](https://github.com/ant-design/ant-design-pro)
- [ProComponents GitHub](https://github.com/ant-design/pro-components)

---

**文档中心版本**: v1.0
**维护者**: 开发团队
**状态**: ✅ 已建立
