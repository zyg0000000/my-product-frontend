# 📚 AgentWorks 文档中心

> 统一的文档导航系统 - 快速找到你需要的文档

## 🎯 快速导航

### 👋 我是新手
1. **[开发者指南](./general/DEVELOPER_GUIDE.md)** - 环境搭建、开发流程
2. **[AgentWorks 产品总览](./agentworks/README.md)** - 产品介绍和快速开始
3. **[故障排查手册](./general/TROUBLESHOOTING.md)** - 常见问题解决

### 💻 我要开发功能
1. **[开发规范](./agentworks/DEVELOPMENT_GUIDELINES.md)** - 代码规范和最佳实践
2. **[UI/UX 规范](./agentworks/UI_UX_GUIDELINES.md)** - 界面设计规范
3. **[组件库手册](./agentworks/COMPONENT_LIBRARY.md)** - 可复用组件
4. **[架构设计](./agentworks/ARCHITECTURE.md)** - 系统架构详解

### 🔍 我要了解功能模块
- **[达人管理](./agentworks/features/)** - 达人相关功能
- **[机构管理](./agentworks/features/)** - 机构管理功能
- **[搜索筛选系统](./agentworks/features/)** - 搜索功能详解
- **[返点系统](./agentworks/features/)** - 返点管理功能
- **[平台配置](./agentworks/features/PLATFORM_CONFIG_FEATURE_GUIDE.md)** - 平台配置系统

### 🚀 我要部署上线
1. **[部署指南](../frontends/agentworks/DEPLOYMENT.md)** - Cloudflare Pages 部署
2. **[API 文档](./agentworks/api/)** - 后端 API 说明

### 🐛 我遇到问题
1. **[故障排查](./general/TROUBLESHOOTING.md)** - 问题诊断和解决
2. **[历史问题](./archive/)** - 历史问题归档

---

## 📖 完整文档目录

### 通用开发文档 (General)
```
docs/general/
├── DEVELOPER_GUIDE.md          # 开发者指南 ⭐
└── TROUBLESHOOTING.md          # 故障排查手册 ⭐
```

### AgentWorks 产品文档
```
docs/agentworks/
├── README.md                       # 产品总览 🆕
├── ARCHITECTURE.md                 # 系统架构
├── DEVELOPMENT_GUIDELINES.md       # 开发规范
├── UI_UX_GUIDELINES.md            # UI/UX 规范
├── PERMISSION_SYSTEM.md           # 权限系统
├── COMPONENT_LIBRARY.md           # 组件库
│
├── features/                      # 功能模块文档
│   ├── PLATFORM_CONFIG_FEATURE_GUIDE.md  # 平台配置
│   ├── MULTI_PRICE_SYSTEM.md            # 多价格系统
│   ├── AUTOMATION.md                    # 自动化功能
│   ├── PROJECT_REPORT.md                # 项目日报
│   └── [其他功能文档...]
│
├── api/                           # API 文档
│   └── [API 详细文档...]
│
└── releases/                      # 版本发布
    ├── PR_INFO.md                 # PR 规范
    └── PR_v*.md                   # 版本 PR 文档
```

### 共享文档 (Shared)
```
docs/shared/
└── STYLE_GUIDE.md                 # 代码风格规范
```

### 历史文档 (Archive)
```
docs/archive/
├── [历史版本总结]
├── [历史计划文档]
└── [过时的文档]
```

---

## 📊 按场景查找文档

### 场景1: 开始开发 AgentWorks
```
1. 阅读产品总览          → docs/agentworks/README.md
2. 搭建开发环境          → docs/general/DEVELOPER_GUIDE.md
3. 了解开发规范          → docs/agentworks/DEVELOPMENT_GUIDELINES.md
4. 查看前端快速开始      → frontends/agentworks/README.md
5. 了解数据库设计        → database/agentworks_db/README.md
```

### 场景2: 开发新功能
```
1. 查看架构设计          → docs/agentworks/ARCHITECTURE.md
2. 查看功能模块文档      → docs/agentworks/features/
3. 查看 UI/UX 规范      → docs/agentworks/UI_UX_GUIDELINES.md
4. 查看组件库            → docs/agentworks/COMPONENT_LIBRARY.md
5. 查看 API 文档         → docs/agentworks/api/
```

### 场景3: 调试问题
```
1. 查看故障排查手册      → docs/general/TROUBLESHOOTING.md
2. 搜索历史问题          → docs/archive/
3. 查看相关功能文档      → docs/agentworks/features/
```

### 场景4: 部署上线
```
1. 查看部署指南          → frontends/agentworks/DEPLOYMENT.md
2. 查看 API 部署         → docs/agentworks/api/
3. 查看数据库部署        → database/agentworks_db/README.md
4. 查看云函数部署        → functions/docs/DEPLOYMENT_GUIDE.md
```

---

## 🗂 其他文档资源

### 数据库文档
- **[数据库总览](../database/README.md)** - 双数据库架构说明
- **[AgentWorks 数据库](../database/agentworks_db/README.md)** - v2.0 多平台数据库
- **[KOL Data 数据库](../database/kol_data/README.md)** - v1.0 单平台数据库

### 云函数文档
- **[云函数索引](../functions/docs/INDEX.md)** - 51+ 云函数列表
- **[云函数部署](../functions/docs/DEPLOYMENT_GUIDE.md)** - 部署详细步骤

### 前端项目文档
- **[AgentWorks 前端](../frontends/agentworks/README.md)** - React + Vite 项目
- **[ByteProject 前端](../frontends/byteproject/README.md)** - v1.0 项目

---

## 📝 文档维护

### 文档更新原则
1. **及时更新**: 功能变更后立即更新相关文档
2. **保持同步**: 代码和文档保持一致
3. **清晰简洁**: 文档语言简洁明了
4. **结构清晰**: 使用统一的文档结构

### 文档贡献
- 发现文档问题请提 Issue
- 文档改进请提 Pull Request
- 新功能请同步更新文档

---

## 🔗 外部资源

- **[主项目 README](../README.md)** - 项目总览
- **[更新日志](../CHANGELOG.md)** - 项目变更历史
- **[AgentWorks CHANGELOG](../frontends/agentworks/CHANGELOG.md)** - 产品更新记录

---

**文档版本**: v2.1
**最后更新**: 2025-12-08
**维护者**: AgentWorks 团队

🤖 Generated with [Claude Code](https://claude.com/claude-code)
