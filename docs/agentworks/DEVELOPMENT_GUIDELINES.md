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
- **UI 框架**：Ant Design Pro 3.x-beta + Ant Design 6.x（v4.0 升级）
- **动画库**：framer-motion 12.x
- **样式方案**：Tailwind CSS 3 + Ant Design（混合模式）
- **路由管理**：React Router 6
- **状态管理**：React Hooks + Context API
- **图标库**：Ant Design Icons + Heroicons

### 后端技术
- **运行时**：Node.js
- **云函数**：Cloudflare Workers
- **数据库**：MongoDB Atlas
- **验证库**：自定义验证函数

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
- **Ant Design 组件**：Modal（弹窗基础）
- **业务弹窗组件**：
  - AgencyFormModal - 机构表单（ProForm + ProCard）
  - AgencyDeleteModal - 机构删除确认
  - AgencyRebateModal_v2 - 机构返点管理（Tabs + ProTable）
  - EditTalentModal - 达人编辑（ProForm + ProCard）
  - DeleteConfirmModal - 达人删除确认
  - RebateManagementModal - 达人返点管理
  - PriceModal - 价格管理
  - TalentSelectorModal - 达人选择弹窗 (v3.8 新增)
  - AddToCustomerModal - 添加达人到客户 (v3.8 新增)
- **布局组件**：Layout, ErrorBoundary

#### `/pages` - 页面组件
- **Talents/** - 达人管理模块
  - BasicInfo - 基础信息列表（手写表格）
  - CreateTalent - 创建达人
  - Agencies - 机构管理（ProTable v2.0）
- **Performance/** - 达人表现模块
  - PerformanceHome - 表现数据（ProTable v2.0）
- **Settings/** - 设置模块
  - PerformanceConfig - 表现配置

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

### UI 开发规范（v3.0）

#### Ant Design Pro + Tailwind 混合模式

**核心原则**：使用 Ant Design Pro 组件构建复杂功能，Tailwind CSS 处理布局和样式

```tsx
// ✅ 表格页面：使用 ProTable
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';

<div className="space-y-4">  {/* Tailwind 布局 */}
  <h1 className="text-2xl font-bold text-gray-900">标题</h1>  {/* Tailwind 文字 */}

  <ProTable  {/* Ant Design Pro 表格 */}
    columns={columns}
    dataSource={data}
    cardBordered
  />
</div>

// ✅ 表单弹窗：ProForm + ProCard
import { Modal, Form } from 'antd';
import { ProForm, ProCard, ProFormText } from '@ant-design/pro-components';

<Modal width={900}>  {/* Ant Design 弹窗 */}
  <ProForm>  {/* Ant Design Pro 表单 */}
    <ProCard title="基础信息" headerBordered bodyStyle={{ padding: '12px 16px' }}>
      <div className="grid grid-cols-2 gap-3">  {/* Tailwind Grid */}
        <ProFormText name="name" label="名称" />
      </div>
    </ProCard>
  </ProForm>
</Modal>
```

#### 组件选择指南
| 功能 | 使用组件 | 示例 |
|------|---------|------|
| 数据表格 | `ProTable` | [PerformanceHome.tsx](frontends/agentworks/src/pages/Performance/PerformanceHome.tsx) |
| 复杂表单 | `ProForm` + `ProCard` | [AgencyFormModal.tsx](frontends/agentworks/src/components/AgencyFormModal.tsx) |
| 弹窗 | `Modal` | 所有 *Modal.tsx 组件 |
| 单层标签页 | `Tabs` | 平台切换 |
| 嵌套标签页 | `Card` + `Tabs` 组合 | [CustomerDetail](frontends/agentworks/src/pages/Customers/CustomerDetail/) |
| 通知 | `App.useApp().message` | 统一通知方案（见下文） |
| 布局 | Tailwind `flex`, `grid` | 所有页面 |
| 间距 | Tailwind `space-y-*`, `gap-*` | 所有页面 |

#### 嵌套 Tab 规范（v3.8+）

当需要两层导航时（如平台切换 + 功能模块），使用以下模式：

```tsx
import { Tabs, Card } from 'antd';

<Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
  {/* 主级 Tab：size="large"，自定义 tabBarStyle */}
  <Tabs
    activeKey={platform}
    onChange={setPlatform}
    items={platformItems}
    tabBarStyle={{
      marginBottom: 0,
      paddingLeft: 16,
      paddingRight: 16,
      borderBottom: '1px solid #f0f0f0',
    }}
    size="large"
  />
  {/* 子级 Tab：type="card"，带图标 */}
  <div className="p-4">
    <Tabs
      activeKey={feature}
      onChange={setFeature}
      type="card"
      items={featureItems}  // 每个 label 使用 <Icon /> + 文字
    />
  </div>
</Card>
```

详细规范见 [UI/UX 规范 - Tabs 导航](UI_UX_GUIDELINES.md#-tabs-导航规范)

#### 统一通知方案（v3.8.0+）

**唯一官方方式：`App.useApp()`**

```tsx
import { App } from 'antd';

function MyComponent() {
  const { message, modal, notification } = App.useApp();

  const handleSave = async () => {
    try {
      await saveData();
      message.success('保存成功');
    } catch (err) {
      message.error('保存失败');
    }
  };
}
```

**自定义 Hook 中使用：**
```tsx
import { App } from 'antd';

export function useMyHook() {
  const { message } = App.useApp();

  const doSomething = async () => {
    message.success('操作成功');
  };

  return { doSomething };
}
```

> ⚠️ **注意**: 自定义 Hook 可以正常使用 `App.useApp()`，因为它们最终在组件树内被调用。

#### 禁止使用
- ⛔ 手写 `<table>` 标签（使用 ProTable）
- ⛔ `alert()`, `confirm()`, `prompt()`（使用 `App.useApp().message`）
- ⛔ 直接 `import { message } from 'antd'`（使用 `App.useApp()`）
- ⛔ 自定义 Toast/useToast 组件（已废弃并删除）
- ⛔ 手写弹窗容器（使用 Modal）
- ⛔ 内联样式 `style={{ ... }}`（使用 Tailwind）

### CSS/Tailwind 规范

#### 类名组织
```tsx
// ✅ 好的实践：Tailwind + Ant Design 组合
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <Button type="primary" className="custom-tailwind-class">
    保存
  </Button>
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
// 使用 App.useApp() 获取 message 实例
const { message } = App.useApp();

try {
  const response = await getTalents({ platform });
  if (response.success) {
    setData(response.data);
  } else {
    throw new Error(response.message);
  }
} catch (err) {
  message.error('加载失败');
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

## ⚠️ 关键开发要求

### 🔧 云函数开发规范

#### 版本号管理（必须）
每次修改云函数，**必须**更新版本号和日志：

```javascript
/**
 * 云函数名称
 * @version 1.2.3
 * @date 2025-11-24
 * @changelog
 * - v1.2.3 (2025-11-24): 修复返点计算bug
 * - v1.2.2 (2025-11-20): 优化查询性能
 * - v1.2.1 (2025-11-18): 新增平台参数支持
 */

// 版本常量
const VERSION = '1.2.3';

// 函数入口
export default async function handler(request) {
  console.log(`[v${VERSION}] 云函数开始执行`);
  // ...
}
```

#### 版本号规则
- **主版本号（Major）**：不兼容的 API 修改
- **次版本号（Minor）**：向下兼容的功能性新增
- **修订号（Patch）**：向下兼容的问题修复

**示例**：
```
1.0.0 → 1.0.1 (修复bug)
1.0.1 → 1.1.0 (新增功能)
1.1.0 → 2.0.0 (重大重构)
```

#### 日志要求
```javascript
// ✅ 好的实践：记录关键操作和版本
console.log(`[v${VERSION}] 开始处理请求`, { platform, oneId });
console.log(`[v${VERSION}] 数据查询完成`, { count: results.length });
console.log(`[v${VERSION}] 处理完成`);

// ❌ 避免：没有版本标识
console.log('开始处理');
```

### 💰 Token 用量控制

#### 大型功能开发要求
开发大型功能时，**必须关注 Claude Token 用量**：

**规则**：
- ⚠️ **单次对话 Token 用量 > 50,000**：需要提醒用户
- 🚨 **单次对话 Token 用量 > 100,000**：需要考虑分阶段执行
- 📊 **实时报告**：每个关键步骤完成后报告累计用量

**实践**：
```
✅ 好的实践：
1. 任务开始前评估复杂度
2. 大任务拆分成多个小任务
3. 每个阶段完成后报告 Token 用量
4. 超过阈值时主动询问用户是否继续

❌ 避免：
1. 一次性处理所有复杂任务
2. 不监控 Token 用量
3. 不提醒用户成本
```

**报告格式**：
```
✅ 阶段 1 完成 - Token 用量: 25,000 / 预估总用量: 80,000
✅ 阶段 2 完成 - Token 用量: 55,000 / 预估总用量: 80,000
⚠️  Token 用量较高，是否继续？
```

### 🚀 Cloudflare Pages 部署要求

#### 编译严格性
Cloudflare Pages 对代码编译要求**极其严格**，部署前必须检查：

**必检项目**：
```bash
# 1. TypeScript 类型检查（必须）
npm run type-check
# 或
npx tsc --noEmit

# 2. ESLint 检查（必须）
npm run lint

# 3. 本地构建测试（必须）
npm run build

# 4. 预览构建结果（推荐）
npm run preview
```

#### 常见编译错误

##### 错误 1: TypeScript 类型错误
```typescript
// ❌ 会导致部署失败
const data = response.data;  // Type 'unknown'
data.map(item => ...)        // Error!

// ✅ 正确做法
const data = response.data as Talent[];
data.map(item => ...)
```

##### 错误 2: 未使用的变量/导入 (TS6133)
```typescript
// ❌ 会导致部署失败
import { useState, useEffect } from 'react';  // useEffect 未使用
import { Space, Button } from 'antd';  // Space 未使用

// ✅ 正确做法：只导入使用的内容
import { useState } from 'react';
import { Button } from 'antd';

// ❌ 会导致部署失败：未使用的函数参数
items.map((item, index) => <div key={item.id}>{item.name}</div>)  // index 未使用

// ✅ 正确做法：移除未使用的参数
items.map((item) => <div key={item.id}>{item.name}</div>)

// ✅ 或使用下划线前缀表示故意忽略
items.map((item, _index) => <div key={item.id}>{item.name}</div>)
```

##### 错误 3: 类型不匹配 (TS2322)
```typescript
// ❌ 会导致部署失败：字符串模板不匹配字面量联合类型
type PriceType = 'video_60plus' | 'video_21_60' | 'live';
const key: PriceType = `price_${Date.now()}`;  // Error!

// ✅ 正确做法：使用 string 类型或类型断言
interface Config {
  key: string;  // 改用 string 而非严格的联合类型
}

// ✅ 或使用类型断言（确保值正确时）
const key = `video_60plus` as PriceType;
```

##### 错误 4: 缺失依赖
```typescript
// ❌ 会导致部署失败
import { ProTable } from '@ant-design/pro-components';  // 未安装

// ✅ 确保已安装
npm install @ant-design/pro-components
```

#### TypeScript 严格模式最佳实践

**Cloudflare Pages 使用 `tsc -b`（严格模式）编译**，以下规则必须遵守：

| 规则 | 错误码 | 说明 | 解决方案 |
|------|--------|------|----------|
| 未使用的导入 | TS6133 | 导入但未使用的模块 | 删除未使用的导入 |
| 未使用的变量 | TS6133 | 声明但未使用的变量 | 删除或使用 `_` 前缀 |
| 未使用的参数 | TS6133 | 函数参数未使用 | 删除或使用 `_` 前缀 |
| 类型不匹配 | TS2322 | 赋值类型不兼容 | 修正类型定义或使用断言 |
| 隐式 any | TS7006 | 参数缺少类型注解 | 添加明确类型 |

**开发时自动检查**（推荐配置 VS Code）：
```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.removeUnusedImports": true
  }
}
```

#### 部署前检查清单
```bash
# 完整检查流程
#!/bin/bash

echo "🔍 开始部署前检查..."

# 1. 类型检查
echo "1️⃣ TypeScript 类型检查..."
npm run type-check || exit 1

# 2. Lint 检查
echo "2️⃣ ESLint 检查..."
npm run lint || exit 1

# 3. 构建测试
echo "3️⃣ 生产构建..."
npm run build || exit 1

# 4. 检查构建产物
echo "4️⃣ 检查 dist/ 目录..."
ls -lh dist/

echo "✅ 所有检查通过，可以部署！"
```

#### antd v6 / pro-components v3 API 迁移指南（2025-12）

升级到 antd 6.x 和 @ant-design/pro-components 3.x-beta 后，以下 API 已变更：

**1. Popover styles API**
```tsx
// ✅ 使用 body (兼容 antd v5，Cloudflare 部署环境)
<Popover styles={{ body: { padding: 12 } }}>

// ⚠️ inner 仅在 antd v6 可用，但 Cloudflare 可能使用 v5
// <Popover styles={{ inner: { padding: 12 } }}>  // 不要使用
```

**2. ProColumns hideInSearch**
```tsx
// ❌ pro-components v2 (旧)
const columns: ProColumns[] = [
  { title: '名称', dataIndex: 'name', hideInSearch: true }
];

// ✅ pro-components v3 (新)
const columns: ProColumns[] = [
  { title: '名称', dataIndex: 'name', search: false }
];
```

**3. ProCard bordered**
```tsx
// ❌ pro-components v2 (旧)
<ProCard bordered>内容</ProCard>

// ✅ pro-components v3 (新) - 使用 Tailwind 替代
<ProCard className="border border-gray-200">内容</ProCard>
```

**4. framer-motion ease 类型**
```tsx
// ❌ framer-motion v12 不接受数组或普通字符串
const variants = {
  hidden: { opacity: 0, transition: { ease: [0.22, 1, 0.36, 1] } }  // 错误
  // 或 ease: 'easeOut'  // 也可能报错（类型推断问题）
};

// ✅ framer-motion v12 - 使用 as const 断言
const variants = {
  hidden: { opacity: 0, transition: { ease: 'easeOut' as const } }
};
```

**5. ProFormInstance ref 类型**
```tsx
// ❌ 旧写法
const formRef = useRef<ProFormInstance<FormData>>(null);

// ✅ 新写法 - 允许 undefined
const formRef = useRef<ProFormInstance<FormData> | undefined>(undefined);
```

> 📌 **注意**：项目使用 `.npmrc` 配置 `legacy-peer-deps=true` 绕过 pro-components v3 beta 的 peer dependency 警告（requires antd ^5.11.2 但项目使用 antd 6.x）

#### Cloudflare 特殊要求

**文件大小限制**：
- 单个文件 < 25 MB
- 总部署大小 < 20 MB（压缩后）

**优化建议**：
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/pro-components']
        }
      }
    },
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true  // 生产环境移除 console
      }
    }
  }
});
```

### 📝 其他开发要求

#### Git 提交规范
```bash
# 格式
<type>(<scope>): <subject>

# 类型
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具链相关

# 示例
feat(talent): 新增达人批量导入功能
fix(rebate): 修复返点计算精度问题
docs(readme): 更新部署文档
```

#### 代码审查要点
- ✅ 版本号和日志是否更新
- ✅ TypeScript 类型是否完整
- ✅ 是否有未使用的变量/导入
- ✅ 是否有 console.log（生产环境应移除）
- ✅ 是否有硬编码的敏感信息
- ✅ 构建是否成功

---

## 🚀 部署流程

### 前端部署（Cloudflare Pages）

#### 1. 部署前检查
```bash
# 必须全部通过
npm run type-check  # TypeScript 检查
npm run lint        # 代码规范检查
npm run build       # 构建测试
npm run preview     # 本地预览
```

#### 2. 环境变量配置
```env
# Cloudflare Pages 环境变量
VITE_API_BASE_URL=https://your-api.com
VITE_ENV=production
NODE_VERSION=20  # 必须指定 Node.js 版本
```

#### 3. 自动部署
```bash
# 推送到 main 分支自动触发部署
git push origin main

# Cloudflare Pages 会自动：
# 1. 检测到推送
# 2. 执行 npm install
# 3. 执行 npm run build
# 4. 部署 dist/ 目录
```

#### 4. 部署验证
- [ ] 访问生产 URL 确认可访问
- [ ] 检查控制台无报错
- [ ] 测试核心功能正常
- [ ] 检查 API 调用正常

### 云函数部署

#### 部署检查
- [ ] 更新版本号
- [ ] 更新 CHANGELOG
- [ ] 添加版本日志注释
- [ ] 本地测试通过
- [ ] 代码审查通过

---

## 🔗 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 项目更新日志
- [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md) - UI/UX 开发规范
- [REBATE_DEVELOPMENT_PLAN.md](./REBATE_DEVELOPMENT_PLAN.md) - 返点功能开发计划

---

**维护者**: Claude Code
**最后更新**: 2025-12-08

🤖 Generated with [Claude Code](https://claude.com/claude-code)