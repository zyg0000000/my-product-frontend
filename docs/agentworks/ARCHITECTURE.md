# AgentWorks 项目架构文档

## 📋 目录
- [系统概览](#系统概览)
- [架构设计](#架构设计)
- [技术栈详解](#技术栈详解)
- [核心模块](#核心模块)
- [数据流架构](#数据流架构)
- [API架构](#api架构)
- [状态管理](#状态管理)
- [部署架构](#部署架构)

---

## 🎯 系统概览

AgentWorks 是一个企业级多平台达人管理系统，采用现代化的前后端分离架构。

### 系统定位
- **目标用户**：MCN机构、品牌方、营销团队
- **核心价值**：统一管理多平台达人资源，优化商务合作流程
- **技术特点**：响应式设计、实时数据同步、模块化架构

### 支持平台
- 抖音 (douyin)
- 小红书 (xiaohongshu)
- B站 (bilibili)
- 快手 (kuaishou)

---

## 🏗 架构设计

### 整体架构
```
┌─────────────────────────────────────────┐
│            前端应用层                    │
│   React + TypeScript + Tailwind CSS     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│            API 网关层                    │
│         RESTful API + JSON              │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│            业务逻辑层                    │
│     Node.js + Express + Prisma          │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│            数据持久层                    │
│         PostgreSQL Database             │
└─────────────────────────────────────────┘
```

### 前端架构模式
- **组件化设计**：可复用的UI组件库
- **路由驱动**：基于React Router的SPA应用
- **状态管理**：Context API + Hooks
- **样式方案**：Utility-First CSS (Tailwind)

---

## 💻 技术栈详解

### 前端技术栈

#### 核心框架
```typescript
// React 18 - UI框架
import React from 'react';

// TypeScript - 类型安全
interface TalentData {
  oneId: string;
  platform: Platform;
  // ...
}

// Vite - 构建工具
// 特点：快速冷启动、即时热更新
```

#### 样式解决方案
```css
/* Tailwind CSS - Utility Classes */
.card {
  @apply rounded-lg bg-white shadow-md p-4;
}

/* 设计系统 */
- 颜色系统：Primary/Success/Warning/Error
- 间距系统：4px倍数 (Tailwind scale)
- 响应式断点：sm/md/lg/xl
```

### 后端技术栈

#### 服务架构
- **运行时**：Node.js v18+
- **框架**：Express.js
- **数据库**：PostgreSQL 14+
- **ORM**：Prisma (计划引入)

#### API设计
- RESTful 风格
- JSON数据格式
- JWT认证（计划）

---

## 📦 核心模块

### 1. 达人管理模块
```
/pages/Talents/
├── BasicInfo/          # 基础信息列表
│   ├── 搜索筛选系统
│   ├── 多平台Tab切换
│   └── 批量操作
├── CreateTalent/       # 创建达人
└── TalentDetail/       # 达人详情
```

**核心功能**
- 多平台达人信息维护
- 时间序列化价格管理
- 返点配置管理
- 历史记录追踪

### 2. 机构管理模块
```
/pages/Talents/Agencies/
├── 机构列表
├── 机构返点管理
└── 批量同步功能
```

**核心功能**
- 机构信息维护
- 返点率批量管理
- 达人归属管理

### 3. 搜索筛选系统
```typescript
// 搜索维度
interface SearchFilters {
  searchTerm: string;        // 名称/OneID
  talentLevel: string[];     // 达人层级
  contentTags: string[];     // 内容标签
  rebateRange: [min, max];   // 返点区间
  priceRange: [min, max];    // 价格区间
  priceTiers: string[];      // 价格档位
}
```

### 4. 价格管理系统

#### 数据模型
```typescript
interface PriceRecord {
  platform: Platform;
  tier: PriceTier;      // 档位：60S+, 20-60S等
  price: number;        // 单位：分
  month: string;        // YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}
```

#### 平台差异化
- **抖音/快手**：视频时长档位
- **小红书**：内容类型（图文/视频）
- **B站**：定制化档位

### 5. 返点管理系统

#### 返点模式
```typescript
enum RebateMode {
  AGENCY = 'agency',      // 机构绑定模式
  INDEPENDENT = 'independent'  // 独立设置模式
}

interface RebateConfig {
  talentId: string;
  rate: number;         // 百分比存储
  mode: RebateMode;
  source: string;       // 来源：手动/规则/机构
  validFrom: Date;
  validTo?: Date;
}
```

---

## 🔄 数据流架构

### 单向数据流
```
用户交互 → Action → API调用 → 状态更新 → UI渲染
```

### 状态管理策略
1. **组件状态**：useState - 局部UI状态
2. **共享状态**：Context API - 跨组件状态
3. **服务器状态**：API调用 + 本地缓存
4. **持久化状态**：localStorage - 用户偏好

### 数据缓存策略
- **列表数据**：5分钟缓存
- **详情数据**：实时获取
- **配置数据**：会话级缓存

---

## 🔌 API架构

### API分层设计
```
前端应用
    ↓
API接口层 (/api)
    ↓
业务服务层
    ↓
数据访问层
    ↓
数据库
```

### 核心API模块

#### 达人API
```typescript
// 基础CRUD
GET    /api/talents
GET    /api/talents/:oneId/:platform
POST   /api/talents
PUT    /api/talents/:oneId/:platform
DELETE /api/talents/:oneId/:platform

// 价格管理
GET    /api/talents/:oneId/:platform/prices
POST   /api/talents/:oneId/:platform/prices
PUT    /api/talents/:oneId/:platform/prices/:month

// 返点管理
GET    /api/talents/:oneId/:platform/rebate
POST   /api/talents/:oneId/:platform/rebate
PUT    /api/talents/:oneId/:platform/rebate
```

#### 机构API
```typescript
GET    /api/agencies
GET    /api/agencies/:id
POST   /api/agencies
PUT    /api/agencies/:id
DELETE /api/agencies/:id

// 批量操作
POST   /api/agencies/:id/batch-update-rebate
POST   /api/agencies/:id/sync-talents
```

### API响应格式
```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}
```

---

## 🎯 状态管理

### Context结构
```typescript
// AppContext - 全局应用状态
interface AppContextType {
  user: User | null;
  platform: Platform;
  theme: Theme;
}

// TalentContext - 达人模块状态
interface TalentContextType {
  talents: Talent[];
  filters: FilterState;
  loading: boolean;
}
```

### 状态更新模式
```typescript
// 优化的状态更新
const updateTalent = useCallback((id: string, updates: Partial<Talent>) => {
  setTalents(prev => prev.map(
    t => t.oneId === id ? { ...t, ...updates } : t
  ));
}, []);
```

---

## 🚀 部署架构

### 开发环境
```bash
# 前端开发服务器
npm run dev         # Vite dev server on :5173

# 后端开发服务器
npm run server:dev  # Express on :3001
```

### 生产环境
```bash
# 构建流程
npm run build       # Vite production build
npm run preview     # 预览生产构建

# 部署配置
- 静态资源：CDN分发
- API服务：容器化部署
- 数据库：云数据库服务
```

### 环境变量
```env
# .env.development
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ENV=development

# .env.production
VITE_API_BASE_URL=https://api.agentworks.com
VITE_ENV=production
```

### 性能优化
- **代码分割**：路由级别懒加载
- **资源优化**：图片懒加载、WebP格式
- **缓存策略**：HTTP缓存 + Service Worker
- **打包优化**：Tree Shaking、压缩

---

## 📊 监控与日志

### 前端监控
- 错误边界捕获
- 性能指标收集
- 用户行为分析

### 后端监控
- API响应时间
- 错误率统计
- 数据库查询性能

### 日志级别
- ERROR：系统错误
- WARN：警告信息
- INFO：一般信息
- DEBUG：调试信息

---

## 🔐 安全架构

### 前端安全
- XSS防护：React自动转义
- CSRF防护：Token验证
- 敏感数据：不存储在前端

### API安全
- 认证授权：JWT Token（计划）
- 参数验证：输入校验
- SQL注入：参数化查询

### 数据安全
- 传输加密：HTTPS
- 存储加密：敏感字段加密
- 访问控制：角色权限（计划）

### 权限预留规范 ⭐ v3.9.0 新增

为后续权限系统实现预留的数据层字段：

```typescript
// 所有集合必须包含
interface BaseDocument {
  createdBy: string;       // 创建人 userId
  updatedBy: string;       // 最后更新人
  createdAt: Date;
  updatedAt: Date;
}

// 资源类集合额外包含
interface ResourceDocument extends BaseDocument {
  organizationId?: string; // 组织隔离（预留）
  departmentId?: string;   // 部门隔离（预留）
  visibility?: 'private' | 'department' | 'organization' | 'public';
}
```

**已实施集合**：
- `customers` - 客户管理
- `customer_talents` - 客户达人池
- `talents` - 达人信息

详细规范请查看 **[权限预留规范文档](./PERMISSION_RESERVATION_SPEC.md)**

---

## 📈 扩展性设计

### 可扩展点
1. **平台扩展**：新平台接入
2. **功能模块**：插件化设计
3. **API版本**：版本控制
4. **数据模型**：向后兼容

### 未来规划
- 微服务架构演进
- GraphQL API支持
- 实时数据推送(WebSocket)
- AI智能推荐

---

## 📝 相关文档

- [开发指南](./DEVELOPMENT_GUIDELINES.md) - 开发流程和规范
- [UI/UX规范](./UI_UX_GUIDELINES.md) - 界面设计规范
- [更新日志](./frontends/agentworks/CHANGELOG.md) - 版本更新记录
- [API文档](./docs/API_DOCUMENTATION.md) - API详细说明

---

**维护者**: Claude Code
**创建日期**: 2025-11-18
**最后更新**: 2025-11-18

🤖 Generated with [Claude Code](https://claude.com/claude-code)