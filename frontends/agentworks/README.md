# AgentWorks 前端项目

> React + TypeScript + Vite 构建的企业级达人管理系统前端

## 🚀 快速开始

### 前置要求
- Node.js >= 20.19 或 >= 22.12
- npm >= 10.0

### 5分钟启动项目

```bash
# 1. 安装依赖（首次运行）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问应用
# 浏览器自动打开 http://localhost:5173/
```

### 常用命令

```bash
npm run dev          # 启动开发服务器（支持热更新）
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 代码检查
npm run type-check   # TypeScript 类型检查
```

---

## 📁 项目结构

```
frontends/agentworks/
├── public/              # 静态资源
│   └── _redirects       # Cloudflare Pages 路由配置
├── src/
│   ├── api/             # API 调用层
│   │   ├── client.ts    # HTTP 客户端
│   │   └── talent.ts    # 达人 API
│   ├── components/      # 通用组件
│   │   ├── Layout/      # 布局组件
│   │   └── Sidebar/     # 侧边栏
│   ├── pages/           # 页面组件
│   │   ├── Home/        # 首页
│   │   ├── Talents/     # 达人管理
│   │   │   ├── BasicInfo/       # 基础信息
│   │   │   ├── Agencies/        # 机构管理
│   │   │   └── PlatformConfig/  # 平台配置
│   │   └── [其他页面...]
│   ├── types/           # TypeScript 类型定义
│   ├── utils/           # 工具函数
│   ├── hooks/           # 自定义 Hooks
│   ├── App.tsx          # 应用入口
│   ├── main.tsx         # React 挂载点
│   └── index.css        # 全局样式
├── index.html           # HTML 模板
├── package.json         # 依赖配置
├── tsconfig.json        # TypeScript 配置
├── vite.config.ts       # Vite 配置
├── tailwind.config.js   # Tailwind CSS 配置
├── CHANGELOG.md         # 更新日志
└── DEPLOYMENT.md        # 部署指南
```

---

## 🛠 技术栈

### 核心框架
- **React 19** - UI 框架
- **TypeScript 5** - 类型安全
- **Vite 7** - 构建工具（快速热更新）

### UI 组件库
- **Ant Design 5** - 企业级 UI 组件
- **Ant Design Pro Components** - 高级业务组件
  - ProTable - 高级表格
  - ProForm - 高级表单
- **Tailwind CSS 3** - 实用样式框架

### 路由与状态
- **React Router 7** - 路由管理
- **Zustand** - 状态管理

### 图标与工具
- **Heroicons** - 图标库
- **Day.js** - 日期处理
- **Axios** - HTTP 请求

---

## 🌟 核心功能

### 达人管理
- ✅ 多平台达人列表（抖音、小红书、B站、快手）
- ✅ 达人详情查看与编辑
- ✅ 时间序列化价格管理
- ✅ 返点配置管理
- ✅ 综合搜索筛选系统

### 机构管理
- ✅ 机构信息维护
- ✅ 批量返点管理
- ✅ 达人归属管理

### 平台配置
- ✅ 达人层级配置
- ✅ 内容标签配置
- ✅ 价格档位配置

---

## 🔧 开发指南

### 环境变量配置

创建 `.env.local` 文件：

```env
# API 基础 URL
VITE_API_BASE_URL=https://your-api-gateway.com

# 环境标识
VITE_ENV=development
```

### 代码规范

#### 命名规范
- **组件**: PascalCase - `TalentList.tsx`
- **函数**: camelCase - `formatPrice`
- **类型**: PascalCase - `Talent`, `Platform`
- **常量**: UPPER_SNAKE_CASE - `API_BASE_URL`

#### 文件组织
```typescript
// ✅ 推荐：一个组件一个文件
src/pages/Talents/BasicInfo/BasicInfo.tsx

// ✅ 推荐：相关组件放在同一目录
src/pages/Talents/
  ├── BasicInfo/
  ├── Agencies/
  └── PlatformConfig/
```

#### 导入顺序
```typescript
// 1. React 相关
import React, { useState, useEffect } from 'react';

// 2. 第三方库
import { Button } from 'antd';
import { ProTable } from '@ant-design/pro-components';

// 3. 项目内部
import { getTalents } from '@/api/talent';
import { Talent } from '@/types/talent';
```

### 组件开发最佳实践

#### 使用 TypeScript
```typescript
// ✅ 推荐：明确的类型定义
interface TalentListProps {
  platform: Platform;
  onSelect?: (talent: Talent) => void;
}

const TalentList: React.FC<TalentListProps> = ({ platform, onSelect }) => {
  // ...
};
```

#### 使用 ProComponents
```typescript
// ✅ 推荐：使用 ProTable 替代原生表格
import { ProTable } from '@ant-design/pro-components';

<ProTable<Talent>
  columns={columns}
  request={async (params) => {
    const data = await getTalents(params);
    return { data, success: true };
  }}
  search={{
    labelWidth: 'auto',
  }}
  pagination={{
    defaultPageSize: 20,
  }}
/>
```

---

## 📚 相关文档

### 产品文档
- **[产品总览](../../docs/agentworks/README.md)** - AgentWorks 完整介绍
- **[系统架构](../../docs/agentworks/ARCHITECTURE.md)** - 技术架构设计
- **[开发规范](../../docs/agentworks/DEVELOPMENT_GUIDELINES.md)** - 开发规范和最佳实践
- **[UI/UX 规范](../../docs/agentworks/UI_UX_GUIDELINES.md)** - 界面设计规范

### 开发文档
- **[开发者指南](../../docs/general/DEVELOPER_GUIDE.md)** - 环境搭建和开发流程
- **[组件库手册](../../docs/agentworks/COMPONENT_LIBRARY.md)** - ProTable/ProForm 使用指南
- **[故障排查](../../docs/general/TROUBLESHOOTING.md)** - 常见问题解决

### 部署文档
- **[部署指南](./DEPLOYMENT.md)** - Cloudflare Pages 部署教程
- **[更新日志](./CHANGELOG.md)** - 版本更新记录

---

## 🐛 常见问题

### Q1: npm install 失败
```bash
# 清除缓存后重试
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Q2: 开发服务器启动失败
```bash
# 检查 Node.js 版本（需要 >= 20.19）
node -v

# 升级 Node.js
nvm install 20
nvm use 20
```

### Q3: API 请求失败
- 检查 `.env.local` 文件是否配置正确
- 检查 API 服务是否正常运行
- 查看浏览器控制台错误信息

更多问题请查看 **[故障排查手册](../../docs/general/TROUBLESHOOTING.md)**

---

## 🔗 外部链接

### 官方文档
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vitejs.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Ant Design](https://ant.design/)
- [Ant Design Pro Components](https://procomponents.ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**项目版本**: v3.4.0
**Node.js 要求**: >= 20.19 或 >= 22.12
**最后更新**: 2025-11-24

🤖 Generated with [Claude Code](https://claude.com/claude-code)
