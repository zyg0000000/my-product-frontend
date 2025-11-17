# 开发指南

## 📋 目录
- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [API规范](#api规范)
- [测试规范](#测试规范)
- [部署流程](#部署流程)

---

## 🎯 项目概述

AgentWorks 是一个多平台达人管理系统，支持抖音、小红书、B站、快手等平台的达人信息管理、价格管理、返点管理等功能。

### 核心功能模块
- **达人管理**：多平台达人信息维护
- **价格管理**：时间序列化的价格档位管理
- **返点系统**：机构/独立返点模式管理
- **机构管理**：机构信息和返点批量管理
- **搜索筛选**：多维度智能筛选系统

---

## 🛠 技术栈

### 前端技术
- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式方案**：Tailwind CSS 3
- **路由管理**：React Router 6
- **状态管理**：React Hooks + Context API
- **图标库**：Heroicons

### 后端技术
- **运行时**：Node.js + Express
- **数据库**：PostgreSQL
- **ORM**：Prisma（计划）

### 开发工具
- **包管理**：npm
- **代码格式化**：Prettier
- **代码检查**：ESLint
- **版本控制**：Git

---

## 📁 项目结构

```
my-product-frontend/
├── frontends/
│   ├── agentworks/          # React 应用
│   │   ├── src/
│   │   │   ├── api/         # API 接口
│   │   │   ├── components/  # 通用组件
│   │   │   ├── hooks/       # 自定义 Hooks
│   │   │   ├── pages/       # 页面组件
│   │   │   ├── types/       # TypeScript 类型
│   │   │   ├── utils/       # 工具函数
│   │   │   └── styles/      # 全局样式
│   │   └── public/          # 静态资源
│   └── byteproject/         # 旧版项目（参考）
├── backend/                 # 后端服务
├── docs/                    # 项目文档
│   ├── CHANGELOG.md        # 更新日志
│   ├── UI_UX_GUIDELINES.md # UI/UX规范
│   ├── DEVELOPMENT_GUIDELINES.md # 开发指南
│   └── README.md           # 项目说明
└── package.json
```

### 核心目录说明

#### `/api` - API 接口层
- `talent.ts` - 达人相关接口
- `agency.ts` - 机构相关接口
- `rebate.ts` - 返点相关接口
- `price.ts` - 价格相关接口

#### `/components` - 组件库
- **通用组件**：Toast, Modal, Pagination
- **业务组件**：PriceModal, RebateModal, EditTalentModal
- **布局组件**：Layout, Header, Sidebar

#### `/pages` - 页面组件
- **Talents/** - 达人管理模块
  - BasicInfo - 基础信息列表
  - CreateTalent - 创建达人
  - Agencies - 机构管理
- **TalentDetail/** - 达人详情页

#### `/types` - 类型定义
- `talent.ts` - 达人相关类型
- `agency.ts` - 机构相关类型
- `rebate.ts` - 返点相关类型

---

## 🔄 开发流程

### 1. 环境准备
```bash
# 克隆项目
git clone [repository-url]

# 安装依赖
cd my-product-frontend/frontends/agentworks
npm install

# 启动开发服务器
npm run dev
```

### 2. 开发规范

#### 分支管理
- `main` - 主分支，生产环境
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支

#### 提交规范
```bash
# 功能
feat: 添加搜索筛选功能

# 修复
fix: 修复返点率显示问题

# 文档
docs: 更新开发指南

# 样式
style: 优化按钮样式

# 重构
refactor: 重构价格管理模块

# 测试
test: 添加单元测试

# 构建
chore: 更新依赖包
```

### 3. 代码审查
- 所有代码需经过 PR 审查
- 确保通过 ESLint 检查
- 更新相关文档

---

## 📝 代码规范

### TypeScript 规范

#### 类型定义
```typescript
// ✅ 好的实践
interface Talent {
  oneId: string;
  name: string;
  platform: Platform;
  prices: PriceRecord[];
  currentRebate?: RebateConfig;
}

// ❌ 避免
interface Talent {
  oneId: any;
  name: any;
  // ...
}
```

#### 组件定义
```tsx
// ✅ 函数组件 + TypeScript
interface Props {
  talent: Talent;
  onSave: (data: TalentFormData) => Promise<void>;
}

export function TalentEdit({ talent, onSave }: Props) {
  // ...
}
```

### React 规范

#### Hooks 使用
```tsx
// ✅ 好的实践
const [loading, setLoading] = useState(false);
const [data, setData] = useState<Talent[]>([]);

useEffect(() => {
  loadData();
}, [dependency]);

// ❌ 避免
useEffect(() => {
  // 没有依赖数组
  loadData();
});
```

#### 事件处理
```tsx
// ✅ 好的实践
const handleSave = async () => {
  try {
    setLoading(true);
    await saveData();
    success('保存成功');
  } catch (err) {
    error('保存失败');
  } finally {
    setLoading(false);
  }
};
```

### CSS/Tailwind 规范

#### 类名组织
```tsx
// ✅ 好的实践
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
    保存
  </button>
</div>

// ❌ 避免内联样式
<div style={{ display: 'flex', padding: '16px' }}>
```

---

## 🔌 API规范

### RESTful 设计
```typescript
// 获取列表
GET /api/talents?platform=douyin&page=1&limit=20

// 获取详情
GET /api/talents/:oneId/:platform

// 创建
POST /api/talents
Body: { name, platform, prices, ... }

// 更新
PUT /api/talents/:oneId/:platform
Body: { name, prices, ... }

// 删除
DELETE /api/talents/:oneId/:platform
```

### 响应格式
```typescript
// 成功响应
{
  success: true,
  data: { ... },
  message?: '操作成功'
}

// 错误响应
{
  success: false,
  error: 'ERROR_CODE',
  message: '错误描述'
}
```

### 错误处理
```typescript
try {
  const response = await getTalents({ platform });
  if (response.success) {
    setData(response.data);
  } else {
    throw new Error(response.message);
  }
} catch (err) {
  error('加载失败');
}
```

---

## 🧪 测试规范

### 单元测试（计划中）
- 使用 Vitest + React Testing Library
- 覆盖率目标：80%
- 关键功能必须有测试

### E2E测试（计划中）
- 使用 Playwright
- 覆盖核心用户流程

---

## 🚀 部署流程

### 构建
```bash
npm run build
```

### 环境变量
```env
VITE_API_BASE_URL=https://api.example.com
VITE_ENV=production
```

### 部署检查
- [ ] 代码通过 lint 检查
- [ ] 构建成功无错误
- [ ] 更新 CHANGELOG
- [ ] 更新版本号
- [ ] 创建 Git tag

---

## 🔗 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 项目更新日志
- [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md) - UI/UX 开发规范
- [REBATE_DEVELOPMENT_PLAN.md](./REBATE_DEVELOPMENT_PLAN.md) - 返点功能开发计划

---

**维护者**: Claude Code
**最后更新**: 2025-11-18

🤖 Generated with [Claude Code](https://claude.com/claude-code)