# AgentWorks - 多平台达人营销管理系统

> 企业级达人资源管理平台，支持抖音、小红书、B站、快手等多平台统一管理

## 📋 产品概述

### 产品定位
AgentWorks 是新一代多平台达人营销管理系统（v2.0），专为 MCN 机构、品牌方和营销团队打造。

### 核心价值
- 🌐 **多平台统一管理** - 支持4大主流平台（抖音、小红书、B站、快手）
- 🔗 **跨平台达人关联** - oneId 系统实现达人跨平台身份识别
- 💰 **灵活的返点系统** - 支持机构绑定和独立设置两种模式
- 📊 **时间序列化管理** - 价格和返点历史完整追溯
- 🎨 **现代化UI** - React + TypeScript + Ant Design Pro

### 技术亮点
- **前端**: React 19 + TypeScript + Vite 7 + Tailwind CSS
- **UI 组件**: Ant Design Pro Components
- **状态管理**: Zustand
- **后端**: Node.js + 云函数 (Serverless)
- **数据库**: MongoDB (agentworks_db)
- **部署**: Cloudflare Pages

---

## 🚀 快速开始

### 前置要求
- Node.js 20.19+ 或 22.12+
- npm 或 yarn
- 现代浏览器

### 本地开发（5分钟）
```bash
# 1. 进入项目目录
cd frontends/agentworks

# 2. 安装依赖（首次运行）
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:5173/
```

详细开发指南请查看 **[前端快速开始](../../frontends/agentworks/README.md)**

---

## 📚 核心功能模块

### 1. 达人管理
**路径**: `/talents`

**功能**:
- 多平台达人档案管理
- 时间序列化价格管理
- 返点配置管理
- 达人搜索和筛选
- 批量操作

**文档**: [达人管理详细文档](./features/)

### 2. 机构管理
**路径**: `/talents/agencies`

**功能**:
- 机构信息维护
- 批量返点管理
- 达人归属管理
- 机构返点同步

**文档**: [机构管理详细文档](./features/)

### 3. 搜索筛选系统
**特性**:
- 综合搜索（名称/OneID）
- 多维度筛选
  - 达人层级
  - 内容标签
  - 返点区间
  - 价格区间
  - 价格档位

**文档**: [搜索系统详细文档](./features/)

### 4. 平台配置系统
**特性**:
- 达人层级配置
- 内容标签配置
- 价格档位配置
- 平台差异化配置

**文档**: [平台配置详细文档](./features/settings/PLATFORM_CONFIG.md)

### 5. 返点系统
**模式**:
- **机构绑定模式**: 达人自动继承机构返点
- **独立设置模式**: 达人单独设置返点率

**文档**: [返点系统详细文档](./features/)

---

## 🏗 技术架构

### 整体架构
```
前端应用层 (React + TypeScript)
     ↓
API 网关层 (RESTful API)
     ↓
业务逻辑层 (Node.js + 云函数)
     ↓
数据持久层 (MongoDB)
```

详细架构设计请查看 **[系统架构文档](./ARCHITECTURE.md)**

### 数据模型

#### oneId 跨平台关联
```typescript
interface Talent {
  oneId: string;           // 全局唯一ID
  platform: Platform;      // douyin | xiaohongshu | bilibili | kuaishou
  name: string;
  // ...
}
```

#### 时间序列化价格
```typescript
interface PriceRecord {
  year: number;
  month: number;
  type: PriceTier;        // 档位
  price: number;          // 单位：分
  status: 'confirmed' | 'provisional';
}
```

### 平台差异化

| 平台 | 价格档位 |
|------|---------|
| 抖音 | 60S+、20-60S、1-20S、直播 |
| 小红书 | 视频、图文 |
| B站 | 定制化档位 |
| 快手 | 同抖音 |

---

## 📖 开发指南

### 必读文档
1. **[开发规范](./DEVELOPMENT_GUIDELINES.md)** - 代码规范、命名规范、提交规范
2. **[UI/UX 规范](./UI_UX_GUIDELINES.md)** - 界面设计规范和最佳实践
3. **[组件库手册](./COMPONENT_LIBRARY.md)** - ProTable/ProForm 使用指南

### 开发流程
```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并测试
npm run dev

# 3. 提交代码（语义化提交信息）
git commit -m "feat: 添加新功能"

# 4. 推送并创建 PR
git push origin feature/your-feature-name
```

详细开发流程请查看 **[开发者指南](../general/DEVELOPER_GUIDE.md)**

---

## 🔌 API 文档

### 核心 API

#### 达人 API
```typescript
GET    /api/talents                    // 获取达人列表
GET    /api/talents/:oneId/:platform   // 获取单个达人
POST   /api/talents                    // 创建达人
PUT    /api/talents/:oneId/:platform   // 更新达人
DELETE /api/talents/:oneId/:platform   // 删除达人
```

#### 机构 API
```typescript
GET    /api/agencies                   // 获取机构列表
POST   /api/agencies                   // 创建机构
PUT    /api/agencies/:id               // 更新机构
POST   /api/agencies/:id/batch-update-rebate  // 批量更新返点
```

完整 API 文档请查看 **[API 参考](./api/)**

---

## 📦 版本历史

### 最新版本: v3.9.0 (2025-12-03)

**v3.9.0 更新**:
- ✅ 达人全景功能（多视角、模块化筛选）
- ✅ 客户达人池标签管理（重要程度、业务标签）
- ✅ 标签配置动态化（颜色、选项可配置）
- ✅ 权限预留规范实施

**v3.8.0 更新**:
- ✅ 客户达人池功能
- ✅ 通知系统统一化 (App.useApp())

**核心功能**:
- ✅ 多平台达人管理
- ✅ 机构管理系统
- ✅ 综合搜索筛选
- ✅ 平台配置动态化
- ✅ 返点系统（双模式）
- ✅ 时间序列化价格管理
- ✅ 客户管理与达人池
- ✅ 达人全景分析

### 版本发布文档
- [v2.5.0 搜索系统](./releases/PR_v2.5.0_SEARCH_AND_DOCS.md)
- [v2.4.0 机构返点绑定](./releases/PR_v2.4.0_AGENCY_REBATE_BINDING.md)
- [更多版本...](./releases/)

完整更新日志请查看 **[CHANGELOG](../../frontends/agentworks/CHANGELOG.md)**

---

## 🚀 部署上线

### 部署环境
- **生产环境**: Cloudflare Pages
- **API 服务**: 火山引擎云函数
- **数据库**: MongoDB Atlas

### 部署步骤
```bash
# 1. 构建生产版本
npm run build

# 2. 预览构建结果
npm run preview

# 3. 推送到 main 分支自动部署
git push origin main
```

详细部署指南请查看 **[部署文档](../../frontends/agentworks/DEPLOYMENT.md)**

---

## 🐛 故障排查

### 常见问题
1. **API 请求失败** → [故障排查手册](../general/TROUBLESHOOTING.md#q2-api-请求失败)
2. **页面加载白屏** → [故障排查手册](../general/TROUBLESHOOTING.md#q1-页面加载白屏)
3. **数据显示异常** → [故障排查手册](../general/TROUBLESHOOTING.md)

---

## 📊 项目数据

### 代码统计
- **前端代码**: ~15,000+ 行 TypeScript/TSX
- **组件数量**: 50+ 个
- **云函数**: 51+ 个
- **数据库集合**: 10+ 个

### 性能指标
- **首屏加载**: < 2s
- **API 响应**: < 500ms
- **构建时间**: ~30s
- **包体积**: ~150KB (gzipped)

---

## 📝 相关文档

### 核心文档
- **[系统架构](./ARCHITECTURE.md)** - 技术架构详解
- **[开发规范](./DEVELOPMENT_GUIDELINES.md)** - 开发指南
- **[UI/UX 规范](./UI_UX_GUIDELINES.md)** - 设计规范
- **[组件库](./COMPONENT_LIBRARY.md)** - 组件使用

### 功能文档
- **[功能文档索引](./features/INDEX.md)** - 全部功能文档目录
- **[达人全景](./features/analytics/TALENT_PANORAMA.md)** - 多视角达人分析
- **[客户达人池](./features/customers/CUSTOMER_TALENT_POOL.md)** - 客户资源管理
- **[定价策略](./features/customers/PRICING_STRATEGY.md)** - 客户定价配置
- **[平台配置](./features/settings/PLATFORM_CONFIG.md)** - 平台参数管理
- **[标签管理](./features/settings/TAG_MANAGEMENT.md)** - 达人标签配置
- **[多价格系统](./features/MULTI_PRICE_SYSTEM.md)** - 价格管理
- **[自动化功能](./features/AUTOMATION.md)** - 自动化能力

### 架构规范
- **[权限预留规范](./PERMISSION_RESERVATION_SPEC.md)** - 数据层权限预留

### 外部资源
- **[数据库设计](../../database/agentworks_db/README.md)** - v2.0 数据库
- **[云函数文档](../../functions/docs/INDEX.md)** - 51+ 云函数

---

## 🤝 团队与贡献

### 开发团队
- **产品设计**: 产品经理
- **技术开发**: Claude Code + 开发团队
- **项目维护**: AgentWorks 团队

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交变更
4. 创建 Pull Request

---

## 🎯 未来规划

### 短期计划 (Q1 2025)
- [ ] 用户权限系统
- [ ] 数据导出功能增强
- [ ] 性能优化
- [ ] 移动端适配

### 中期计划 (Q2-Q3 2025)
- [ ] AI 达人推荐
- [ ] 智能定价建议
- [ ] 实时数据同步
- [ ] 多租户架构

### 长期愿景
- [ ] 全平台覆盖
- [ ] 国际化支持
- [ ] 大数据分析
- [ ] 智能营销助手

---

**产品版本**: v3.9.0
**文档版本**: v2.2
**最后更新**: 2025-12-05
**维护团队**: AgentWorks Team

🤖 Generated with [Claude Code](https://claude.com/claude-code)
