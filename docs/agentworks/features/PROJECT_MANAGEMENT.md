# AgentWorks 项目管理模块实施方案

## 一、项目概述

将 byteproject 的项目管理功能迁移到 AgentWorks，采用 React + TypeScript + Ant Design Pro 技术栈，支持多平台（抖音、小红书、B站、快手）。

### 核心决策
- **后端 API**：升级现有 API 支持双产品，复杂部分再决定是否新开发
- **数据库**：新建 MongoDB 集合（后续提供数据迁移方案）
- **多平台**：完整支持 4 个平台，项目可跨平台投放

---

## 二、前端架构设计

### 2.1 侧边栏导航结构
```
项目管理
  └ 项目列表   ←  核心入口
```

### 2.2 路由设计
| 路由 | 页面 | 说明 |
|------|------|------|
| `/projects` | ProjectsHome | 项目管理工作台 |
| `/projects/list` | ProjectList | 项目列表页 |
| `/projects/:id` | ProjectDetail | 项目详情页（Tab 切换） |

### 2.3 项目详情页 Tab 结构
采用「功能优先 + 平台筛选器」模式：

```
┌─────────────────────────────────────────────────────┐
│  项目基本信息（名称、预算、状态、客户等）             │
├─────────────────────────────────────────────────────┤
│  [合作达人] [执行追踪] [财务管理] [效果验收]  ← Tab  │
├─────────────────────────────────────────────────────┤
│  平台筛选：[全部] [抖音(12)] [小红书(8)] [B站(3)]   │
├─────────────────────────────────────────────────────┤
│  Tab 内容区（根据平台筛选显示数据）                  │
└─────────────────────────────────────────────────────┘
```

### 2.4 项目管理工作台（ProjectsHome）
```
┌─────────────────────────────────────────────────────────┐
│  项目管理工作台                                          │
├─────────────────────────────────────────────────────────┤
│  📈 本月概览                                             │
│  执行中 12 | 待结算 5 | 收入 ¥85万 | 利润率 14.2%        │
├───────────────────────────┬─────────────────────────────┤
│  ⚠️ 需要关注 (8)           │  📅 本周待发布 (15)          │
│  • 品牌A：3个达人延期发布   │  周一：达人A、达人B           │
│  • 品牌B：预算使用超90%    │  周二：达人C                  │
│  • 品牌C：2个待结算超30天  │  周三：达人D、达人E           │
├───────────────────────────┴─────────────────────────────┤
│  🕐 最近项目                      [+ 新建项目] [查看全部] │
│  [项目卡片列表]                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计（agentworks_db 新集合）

### 3.1 现有数据库对比分析

**kol_data（byteproject）现有结构：**
- `projects`: 项目信息，单平台设计
- `collaborations`: 合作记录，通过 `talentId` 关联达人

**agentworks_db 现有集合：**
- `talents`: 达人基础信息（含 oneId + platform 多平台支持）
- `customers`: 客户信息（含 code 作为唯一标识）
- `agencies`: 机构信息

### 3.2 新增集合设计

#### 3.2.1 `aw_projects` 集合

```javascript
{
  _id: ObjectId("..."),
  id: "proj_1234567890_abc123",      // 业务ID（生成规则同 kol_data）

  // 基本信息
  name: "25年M12抖音+小红书联合投放",
  type: "常规投放",                    // 项目类型
  status: "执行中",                    // 执行中 | 待结算 | 已收款 | 已终结

  // 客户关联（使用 agentworks_db 的 customers）
  customerId: "CUS20250001",          // 关联 customers.code
  customerName: "抖音商城",            // 冗余字段，便于显示

  // 时间维度
  year: 2025,
  month: 12,
  financialYear: 2025,                // 财务年度
  financialMonth: 12,                 // 财务月份

  // 财务信息
  budget: 5000000,                    // 预算（分）
  discount: 0.795,                    // 折扣率
  benchmarkCPM: 15,                   // 基准 CPM
  capitalRateId: "rate_xxx",          // 资金费率配置ID
  qianchuanId: "111",                 // 千川ID（可选）

  // 平台配置（多平台支持）
  platforms: ["douyin", "xiaohongshu"],  // 投放平台列表

  // 调整项（项目级别）
  adjustments: [
    {
      id: "adj_xxx",
      date: "2025-12-10",
      type: "额外返点费",              // 额外返点费 | 服务费减免 | 其他
      description: "xxx额外返点",
      amount: 78000                    // 金额（分），正数为收入，负数为支出
    }
  ],

  // 审计日志
  auditLog: [
    {
      timestamp: ISODate("..."),
      user: "System",
      action: "项目状态变更为: 待结算"
    }
  ],

  // 统计缓存（定期更新）
  stats: {
    collaborationCount: 15,           // 合作达人数
    publishedCount: 12,               // 已发布数
    totalAmount: 3500000,             // 执行总金额
    platformStats: {
      douyin: { count: 10, amount: 2500000 },
      xiaohongshu: { count: 5, amount: 1000000 }
    },
    lastUpdated: ISODate("...")
  },

  createdAt: ISODate("..."),
  updatedAt: ISODate("..."),
  createdBy: "user_xxx",
  updatedBy: "user_xxx"
}
```

**索引设计：**
```javascript
// 唯一索引
{ id: 1 } (unique)

// 查询索引
{ customerId: 1 }
{ status: 1 }
{ year: 1, month: 1 }
{ "platforms": 1 }
{ createdAt: -1 }
```

#### 3.2.2 `aw_collaborations` 集合

```javascript
{
  _id: ObjectId("..."),
  id: "collab_1234567890_xyz789",     // 业务ID
  projectId: "proj_1234567890_abc123", // 关联项目

  // 达人关联（使用 agentworks_db 的 talents）
  talentOneId: "talent_00000001",     // 关联 talents.oneId
  talentPlatform: "douyin",           // 关联 talents.platform
  talentName: "张三的美食日记",        // 冗余字段
  talentSource: "机构达人",            // 达人来源：机构达人 | 独立达人 | 客户指定

  // 合作状态
  status: "视频已发布",                // 待提报工作台 | 工作台已提交 | 客户已定档 | 视频已发布
  orderType: "new",                   // new | modified | cancelled

  // 财务信息
  amount: 1000000,                    // 执行金额（分）
  priceInfo: "2025年12月",            // 价格档期说明
  rebateRate: 25,                     // 返点率 (%)
  actualRebate: 50000,                // 实际返点金额（分）

  // 执行追踪
  plannedReleaseDate: "2025-12-15",   // 计划发布日期
  actualReleaseDate: "2025-12-16",    // 实际发布日期
  taskId: "7548007672172249134",      // 星图任务ID
  videoId: "7548445851165658411",     // 视频ID
  videoUrl: "https://...",            // 视频链接

  // 财务管理
  orderDate: "2025-12-10",            // 下单日期
  paymentDate: null,                  // 打款日期
  recoveryDate: null,                 // 回款日期

  // 差异处理
  discrepancyReason: null,            // 差异原因
  rebateScreenshots: [],              // 返点截图

  // 效果数据（从 talent_performance 获取或手动录入）
  effectData: {
    t7: {                             // T+7 数据
      plays: 1500000,
      likes: 50000,
      comments: 3000,
      shares: 1000,
      cpm: 12.5,
      recordedAt: ISODate("...")
    },
    t21: {                            // T+21 数据
      plays: 2000000,
      likes: 65000,
      comments: 4000,
      shares: 1500,
      cpm: 10.2,
      recordedAt: ISODate("...")
    }
  },

  // 调整项（合作级别）
  adjustments: [
    {
      id: "adj_xxx",
      type: "价格调整",
      amount: -50000,
      reason: "客户折扣"
    }
  ],

  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**索引设计：**
```javascript
// 唯一索引
{ id: 1 } (unique)

// 查询索引
{ projectId: 1 }
{ talentOneId: 1, talentPlatform: 1 }
{ status: 1 }
{ plannedReleaseDate: 1 }
{ actualReleaseDate: 1 }
{ projectId: 1, talentPlatform: 1 }  // 项目内按平台筛选
```

### 3.3 与现有集合的关联关系

```
┌─────────────────┐     customerId      ┌─────────────────┐
│  aw_projects    │ ──────────────────→ │    customers    │
│                 │                      │  (code 字段)    │
└────────┬────────┘                      └─────────────────┘
         │
         │ projectId
         ↓
┌─────────────────┐   oneId + platform  ┌─────────────────┐
│aw_collaborations│ ──────────────────→ │     talents     │
│                 │                      │ (多平台达人库)  │
└─────────────────┘                      └─────────────────┘
```

### 3.4 项目类型配置（扩展 customers 集合）

项目类型由客户决定，在 customers 集合中增加配置：

```javascript
// customers 集合增加字段
{
  // ... 现有字段 ...

  // 项目类型配置（新增）
  projectTypeConfig: {
    types: [
      { id: "regular", name: "常规投放", isDefault: true },
      { id: "seckill", name: "常规秒杀", isDefault: false },
      { id: "brand", name: "品牌合作", isDefault: false },
      { id: "live", name: "直播带货", isDefault: false }
    ],
    allowCustomType: false  // 是否允许自定义类型（不在列表中的）
  }
}
```

**前端管理方式**：
- 在客户详情页新增「项目配置」Tab 或在编辑弹窗中管理
- 项目类型为客户级别配置，不同客户可有不同的类型选项
- 新建项目时，根据所选客户动态加载可选的项目类型

### 3.5 达人选择策略

**核心原则：只允许选择 talents 集合中已有的达人**

原因：
1. 财务计算依赖价格、返点等完整数据
2. 达人信息（价格、返点、机构等）需要一次性补足，不能遗漏
3. 数据一致性：所有达人数据统一在 talents 集合管理

**交互设计**：
```
添加合作达人 → 搜索达人 → 找到 → 选择添加
                              ↓
                         未找到
                              ↓
                    提示："该达人不在达人库中"
                    [前往新增达人] 链接按钮
                              ↓
                    跳转到达人管理页面（新标签页）
                    完整填写达人信息后返回项目页面重新选择
```

**合作记录的达人信息获取**：
- `talentOneId` + `talentPlatform` → 查询 talents 集合
- 获取当前价格（根据 year/month）
- 获取返点率（currentRebate.rate）
- 冗余 `talentName` 用于列表显示

### 3.6 数据迁移方案（后续执行）

从 `kol_data.projects` + `kol_data.collaborations` 迁移到新集合：

**迁移难点**：
1. byteproject 无客户概念 → 需手动关联或通过脚本匹配
2. talentId 格式不同 → 需建立映射表
3. 数据量可能需要手动逐一迁移

**迁移步骤**：
1. **达人映射表**：
   - 建立 `kol_data.talents.id` → `agentworks_db.talents.oneId + platform` 映射
   - 可通过 `platformAccountId` 或 `name` 匹配

2. **项目迁移**：
   - `kol_data.projects` → `agentworks_db.aw_projects`
   - 手动指定每个项目的 customerId
   - 添加 `platforms: ["douyin"]`（历史数据都是抖音）

3. **合作迁移**：
   - `kol_data.collaborations` → `agentworks_db.aw_collaborations`
   - 使用映射表转换 `talentId` → `talentOneId` + `talentPlatform`
   - 未匹配的达人需先在 talents 集合创建

---

## 四、分阶段实施计划

### Phase 1：基础设施

#### 1.1 类型定义 `src/types/project.ts`
```typescript
import type { Platform } from './talent';

// 项目状态
export type ProjectStatus = '执行中' | '待结算' | '已收款' | '已终结';

// 合作状态
export type CollaborationStatus =
  | '待提报工作台' | '工作台已提交' | '客户已定档' | '视频已发布';

// 调整项类型
export type AdjustmentType = '额外返点费' | '服务费减免' | '价格调整' | '其他';

// 调整项
export interface Adjustment {
  id: string;
  date?: string;
  type: AdjustmentType;
  description?: string;
  amount: number;        // 金额（分）
  reason?: string;
}

// 审计日志
export interface AuditLogEntry {
  timestamp: string;
  user: string;
  action: string;
}

// 项目统计
export interface ProjectStats {
  collaborationCount: number;
  publishedCount: number;
  totalAmount: number;
  platformStats: Record<Platform, { count: number; amount: number }>;
  lastUpdated?: string;
}

// 项目
export interface Project {
  id: string;
  name: string;
  type: string;
  status: ProjectStatus;

  // 客户关联
  customerId: string;
  customerName?: string;

  // 时间维度
  year: number;
  month: number;
  financialYear?: number;
  financialMonth?: number;

  // 财务信息
  budget: number;              // 预算（分）
  discount?: number;           // 折扣率
  benchmarkCPM?: number;
  capitalRateId?: string;
  qianchuanId?: string;

  // 多平台支持
  platforms: Platform[];

  // 调整项和审计
  adjustments?: Adjustment[];
  auditLog?: AuditLogEntry[];

  // 统计缓存
  stats?: ProjectStats;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// 效果数据
export interface EffectMetrics {
  plays?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  cpm?: number;
  recordedAt?: string;
}

// 合作记录
export interface Collaboration {
  id: string;
  projectId: string;

  // 达人关联
  talentOneId: string;
  talentPlatform: Platform;
  talentName?: string;
  talentSource?: '机构达人' | '独立达人' | '客户指定';

  // 状态
  status: CollaborationStatus;
  orderType?: 'new' | 'modified' | 'cancelled';

  // 财务
  amount: number;              // 执行金额（分）
  priceInfo?: string;
  rebateRate?: number;
  actualRebate?: number;

  // 执行追踪
  plannedReleaseDate?: string;
  actualReleaseDate?: string;
  taskId?: string;
  videoId?: string;
  videoUrl?: string;

  // 财务管理
  orderDate?: string;
  paymentDate?: string;
  recoveryDate?: string;

  // 差异处理
  discrepancyReason?: string;
  rebateScreenshots?: string[];

  // 效果数据
  effectData?: {
    t7?: EffectMetrics;
    t21?: EffectMetrics;
  };

  // 调整项
  adjustments?: Adjustment[];

  createdAt: string;
  updatedAt: string;
}

// 常量映射
export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['执行中', '待结算', '已收款', '已终结'];

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  '执行中': 'processing',
  '待结算': 'warning',
  '已收款': 'success',
  '已终结': 'default',
};

export const COLLABORATION_STATUS_OPTIONS: CollaborationStatus[] = [
  '待提报工作台', '工作台已提交', '客户已定档', '视频已发布'
];

export const COLLABORATION_STATUS_COLORS: Record<CollaborationStatus, string> = {
  '待提报工作台': 'default',
  '工作台已提交': 'processing',
  '客户已定档': 'warning',
  '视频已发布': 'success',
};
```

#### 1.2 API 服务 `src/api/project.ts`
```typescript
// 项目 API
getProjects(params): Promise<ProjectListResponse>
getProjectById(id): Promise<Project>
createProject(data): Promise<Project>
updateProject(id, data): Promise<Project>
deleteProject(id): Promise<void>

// 合作记录 API
getCollaborations(projectId, params): Promise<CollaborationListResponse>
createCollaboration(data): Promise<Collaboration>
updateCollaboration(id, data): Promise<Collaboration>
deleteCollaboration(id): Promise<void>
batchUpdateCollaborations(ids, data): Promise<void>
```

---

### Phase 2：项目列表页

#### 2.1 ProjectList.tsx
- ProTable 展示项目列表
- 筛选：名称搜索、状态、客户、年月
- 列：项目名称、客户、状态、预算、合作数、进度、操作
- 操作：查看详情、编辑、删除
- 新建项目弹窗

参考：`CustomerList.tsx`

---

### Phase 3：项目详情页框架 + 合作达人 Tab

#### 3.1 ProjectDetail/index.tsx
- 返回按钮 + 标题
- 项目基本信息卡片（Descriptions）
- 4 个功能 Tab
- 平台筛选器（所有 Tab 共享）

#### 3.2 CollaborationsTab.tsx（原基础信息 Tab）
- 合作达人列表（ProTable）
- 状态下拉编辑（Select）
- 档期日期编辑（DatePicker）
- 添加达人（复用 TalentSelectorModal）
- 删除合作

参考：`TalentPoolTab.tsx`、`tab-basic.js`

---

### Phase 4：执行追踪 Tab

#### 4.1 ExecutionTab.tsx
- KPI 面板：计划数、已发布数、发布率、延期数
- 列表视图：按发布日期排序
- 快速编辑：发布日期、视频链接

参考：`tab-performance.js`

---

### Phase 5：财务管理 Tab

#### 5.1 FinancialTab.tsx
- 财务列表：执行金额、下单日期、回款日期、调整项
- 批量操作：批量设置下单日期/回款日期
- 调整项管理：添加/删除调整项

参考：`tab-financial.js`

---

### Phase 6：效果验收 Tab

#### 6.1 EffectTab.tsx
- 子 Tab：T+7 / T+21
- 效果看板：播放量、互动量、CPM、CPE
- 进度条：目标达成率可视化
- 达人明细表格

参考：`tab-effect.js`

---

### Phase 7：项目管理工作台

#### 7.1 ProjectsHome.tsx
- 本月概览统计
- 需要关注（预警提醒）
- 本周待发布（排期预览）
- 最近项目（快捷入口）
- 新建项目按钮

---

## 五、目录结构

```
src/
├── types/
│   └── project.ts                    # 类型定义
├── api/
│   └── project.ts                    # API 服务
├── pages/
│   └── Projects/
│       ├── ProjectsHome.tsx          # 工作台首页
│       ├── ProjectList/
│       │   └── ProjectList.tsx       # 项目列表
│       └── ProjectDetail/
│           ├── index.tsx             # 详情页框架
│           ├── CollaborationsTab.tsx # 合作达人 Tab
│           ├── ExecutionTab.tsx      # 执行追踪 Tab
│           ├── FinancialTab.tsx      # 财务管理 Tab
│           └── EffectTab.tsx         # 效果验收 Tab
└── components/
    ├── ProjectFormModal.tsx          # 项目表单弹窗
    └── PlatformFilter.tsx            # 平台筛选器组件
```

---

## 六、关键复用点

| 复用项 | 来源 | 用途 |
|--------|------|------|
| 页面结构 | `CustomerList.tsx` | 列表页 ProTable 模式 |
| 详情页 | `CustomerDetail.tsx` | Tab 结构 + Descriptions |
| 达人选择 | `TalentSelectorModal.tsx` | 添加合作达人 |
| 弹窗模式 | `DeleteConfirmModal.tsx` | 删除确认 |
| API 模式 | `customerApi.ts` | 类封装 |
| 平台配置 | `usePlatformConfig.ts` | 多平台支持 |

---

## 七、技术规范

1. **通知**：`App.useApp()` 获取 message
2. **弹窗宽度**：900px（大）/ 560px（中）
3. **表格**：ProTable
4. **表单**：ProForm 系列
5. **样式**：Tailwind CSS + Ant Design
6. **URL 状态**：Tab 使用 `?tab=xxx` 参数

---

## 八、配置修改清单

### 8.1 路由配置 `src/App.tsx`

现有路由（第 184 行）：
```typescript
<Route path="projects" element={<ProjectsHome />} />
```

需要修改为：
```typescript
{/* 项目管理模块 */}
<Route path="projects" element={<ProjectsHome />} />
<Route path="projects/list" element={<ProjectList />} />
<Route path="projects/:id" element={<ProjectDetail />} />
```

新增懒加载导入：
```typescript
const ProjectList = lazy(() =>
  import('./pages/Projects/ProjectList/ProjectList').then(m => ({
    default: m.ProjectList,
  }))
);
const ProjectDetail = lazy(() =>
  import('./pages/Projects/ProjectDetail').then(m => ({
    default: m.ProjectDetail,
  }))
);
```

### 8.2 侧边栏菜单 `src/components/Sidebar/Sidebar.tsx`

修改 navigation 数组中的项目管理配置：
```typescript
// 修改前（第 50 行）
{ name: '项目管理', path: '/projects', icon: FolderIcon },

// 修改后
{
  name: '项目管理',
  path: '/projects',
  icon: FolderIcon,
  children: [
    { name: '项目列表', path: '/projects/list' },
  ],
},
```

同时在 expandedMenus 默认值中添加 '项目管理'：
```typescript
const [expandedMenus, setExpandedMenus] = useState<string[]>([
  '达人管理',
  '客户管理',
  '项目管理',  // 新增
  '数据分析',
  '系统设置',
]);
```

### 8.3 类型定义文件 `src/types/project.ts`

新建文件，完整内容见 Phase 1 类型定义。

### 8.4 API 服务文件 `src/api/project.ts`

新建文件，API 结构参考 `src/services/customerApi.ts`。

---

## 九、API 详细设计

### 9.1 项目 API

#### GET `/api/aw-projects`
获取项目列表

**请求参数**：
```typescript
interface GetProjectsParams {
  page?: number;           // 页码，默认 1
  pageSize?: number;       // 每页数量，默认 20
  keyword?: string;        // 搜索关键词（项目名称）
  status?: ProjectStatus;  // 状态筛选
  customerId?: string;     // 客户筛选
  year?: number;           // 年份
  month?: number;          // 月份
  platforms?: Platform[];  // 平台筛选
}
```

**响应**：
```typescript
interface ProjectListResponse {
  success: boolean;
  data: {
    items: Project[];
    total: number;
    page: number;
    pageSize: number;
  };
}
```

#### GET `/api/aw-projects/:id`
获取项目详情

#### POST `/api/aw-projects`
创建项目

**请求体**：
```typescript
interface CreateProjectRequest {
  name: string;
  type: string;
  customerId: string;
  year: number;
  month: number;
  budget: number;
  platforms: Platform[];
  discount?: number;
  benchmarkCPM?: number;
  qianchuanId?: string;
}
```

#### PUT `/api/aw-projects/:id`
更新项目

#### DELETE `/api/aw-projects/:id`
删除项目

### 9.2 合作记录 API

#### GET `/api/aw-collaborations`
获取合作列表

**请求参数**：
```typescript
interface GetCollaborationsParams {
  projectId: string;       // 必填，项目ID
  page?: number;
  pageSize?: number;
  platform?: Platform;     // 平台筛选
  status?: CollaborationStatus;
}
```

#### POST `/api/aw-collaborations`
创建合作记录

**请求体**：
```typescript
interface CreateCollaborationRequest {
  projectId: string;
  talentOneId: string;
  talentPlatform: Platform;
  amount: number;
  plannedReleaseDate?: string;
  rebateRate?: number;
}
```

#### PUT `/api/aw-collaborations/:id`
更新合作记录

#### DELETE `/api/aw-collaborations/:id`
删除合作记录

#### PUT `/api/aw-collaborations/batch`
批量更新合作记录

**请求体**：
```typescript
interface BatchUpdateRequest {
  ids: string[];
  updates: Partial<Collaboration>;  // 只允许更新部分字段
}
```

### 9.3 统计 API

#### GET `/api/aw-projects/:id/stats`
获取项目统计数据（工作台用）

#### GET `/api/aw-projects/dashboard`
获取工作台概览数据

**响应**：
```typescript
interface DashboardResponse {
  success: boolean;
  data: {
    monthlyOverview: {
      executingCount: number;
      pendingSettlementCount: number;
      totalRevenue: number;
      profitRate: number;
    };
    alerts: Array<{
      projectId: string;
      projectName: string;
      type: 'delay' | 'budget_exceeded' | 'pending_long';
      message: string;
    }>;
    weeklySchedule: Array<{
      date: string;
      collaborations: Array<{
        id: string;
        talentName: string;
        projectName: string;
      }>;
    }>;
    recentProjects: Project[];
  };
}
```

---

## 十、后续任务

1. **数据迁移方案**：从 byteproject 集合迁移到新集合
2. **后端 API 升级**：支持 AgentWorks 调用
3. **日历视图**：执行 Tab 的日历模式（Phase 2）
4. **数据导出**：Excel 导出功能

---

## 十一、关键参考文件

**AgentWorks 参考：**
- `src/pages/Customers/CustomerList/CustomerList.tsx`
- `src/pages/Customers/CustomerDetail/CustomerDetail.tsx`
- `src/pages/Customers/CustomerDetail/TalentPoolTab.tsx`
- `src/services/customerApi.ts`
- `src/types/customer.ts`
- `src/components/TalentSelectorModal.tsx`

**byteproject 业务逻辑参考：**
- `frontends/byteproject/order_list/main.js`
- `frontends/byteproject/order_list/tab-basic.js`
- `frontends/byteproject/order_list/tab-performance.js`
- `frontends/byteproject/order_list/tab-financial.js`
- `frontends/byteproject/order_list/tab-effect.js`

---

## 十二、MongoDB Schema 文档（待创建）

创建 `database/agentworks_db/schemas/` 下的 Schema 文档文件：

### 12.1 `aw_projects.doc.json`

```json
{
    "collection": "aw_projects",
    "description": "项目集合 - 支持多平台投放项目管理",
    "database": "agentworks_db",
    "version": "1.0",
    "lastUpdated": "2025-11-30",
    "author": "AgentWorks Team",
    "fields": {
        "_id": {
            "type": "ObjectId",
            "description": "MongoDB 文档 ID",
            "required": true,
            "auto": true
        },
        "id": {
            "type": "String",
            "description": "业务ID（唯一标识）",
            "required": true,
            "pattern": "^proj_[0-9]{13}_[a-z0-9]{6}$",
            "example": "proj_1234567890123_abc123",
            "comment": "生成规则：proj_ + 时间戳 + 随机字符"
        },
        "name": {
            "type": "String",
            "description": "项目名称",
            "required": true,
            "example": "25年M12抖音+小红书联合投放"
        },
        "type": {
            "type": "String",
            "description": "项目类型（由客户配置决定）",
            "required": true,
            "example": "常规投放",
            "comment": "从关联客户的 projectTypeConfig.types 中选择"
        },
        "status": {
            "type": "String",
            "description": "项目状态",
            "required": true,
            "enum": ["执行中", "待结算", "已收款", "已终结"],
            "default": "执行中"
        },
        "customerId": {
            "type": "String",
            "description": "关联客户ID（customers.code）",
            "required": true,
            "example": "CUS20250001"
        },
        "customerName": {
            "type": "String",
            "description": "客户名称（冗余字段）",
            "required": false,
            "comment": "便于列表显示，避免关联查询"
        },
        "year": {
            "type": "Integer",
            "description": "项目年份",
            "required": true,
            "example": 2025
        },
        "month": {
            "type": "Integer",
            "description": "项目月份",
            "required": true,
            "min": 1,
            "max": 12,
            "example": 12
        },
        "financialYear": {
            "type": "Integer",
            "description": "财务年度",
            "required": false,
            "comment": "默认与 year 相同，跨年项目可能不同"
        },
        "financialMonth": {
            "type": "Integer",
            "description": "财务月份",
            "required": false,
            "min": 1,
            "max": 12
        },
        "budget": {
            "type": "Integer",
            "description": "项目预算（单位：分）",
            "required": true,
            "min": 0,
            "example": 5000000,
            "comment": "500万 = 5000000分"
        },
        "discount": {
            "type": "Double",
            "description": "折扣率",
            "required": false,
            "min": 0,
            "max": 1,
            "example": 0.795
        },
        "benchmarkCPM": {
            "type": "Double",
            "description": "基准CPM",
            "required": false,
            "example": 15
        },
        "capitalRateId": {
            "type": "String",
            "description": "资金费率配置ID",
            "required": false
        },
        "qianchuanId": {
            "type": "String",
            "description": "千川ID（可选）",
            "required": false,
            "example": "111"
        },
        "platforms": {
            "type": "Array",
            "description": "投放平台列表",
            "required": true,
            "itemType": "String",
            "itemEnum": ["douyin", "xiaohongshu", "bilibili", "kuaishou"],
            "example": ["douyin", "xiaohongshu"]
        },
        "adjustments": {
            "type": "Array",
            "description": "项目级别调整项",
            "required": false,
            "default": [],
            "itemType": "Object",
            "itemSchema": {
                "id": { "type": "String", "required": true },
                "date": { "type": "String", "description": "日期 YYYY-MM-DD" },
                "type": { "type": "String", "enum": ["额外返点费", "服务费减免", "其他"] },
                "description": { "type": "String" },
                "amount": { "type": "Integer", "description": "金额（分），正数为收入，负数为支出" }
            }
        },
        "auditLog": {
            "type": "Array",
            "description": "审计日志",
            "required": false,
            "default": [],
            "itemType": "Object",
            "itemSchema": {
                "timestamp": { "type": "Date", "required": true },
                "user": { "type": "String", "required": true },
                "action": { "type": "String", "required": true }
            }
        },
        "stats": {
            "type": "Object",
            "description": "统计缓存（定期更新）",
            "required": false,
            "properties": {
                "collaborationCount": { "type": "Integer", "description": "合作达人数" },
                "publishedCount": { "type": "Integer", "description": "已发布数" },
                "totalAmount": { "type": "Integer", "description": "执行总金额（分）" },
                "platformStats": {
                    "type": "Object",
                    "description": "按平台统计",
                    "comment": "键为平台名，值为 { count, amount }"
                },
                "lastUpdated": { "type": "Date" }
            }
        },
        "createdAt": { "type": "Date", "required": true, "default": "now" },
        "updatedAt": { "type": "Date", "required": true, "default": "now" },
        "createdBy": { "type": "String", "required": false },
        "updatedBy": { "type": "String", "required": false }
    },
    "indexes": [
        { "name": "idx_id", "fields": { "id": 1 }, "unique": true },
        { "name": "idx_customerId", "fields": { "customerId": 1 } },
        { "name": "idx_status", "fields": { "status": 1 } },
        { "name": "idx_year_month", "fields": { "year": 1, "month": 1 } },
        { "name": "idx_platforms", "fields": { "platforms": 1 } },
        { "name": "idx_createdAt", "fields": { "createdAt": -1 } }
    ],
    "relations": [
        {
            "collection": "customers",
            "type": "many-to-one",
            "localField": "customerId",
            "foreignField": "code",
            "description": "项目关联客户"
        },
        {
            "collection": "aw_collaborations",
            "type": "one-to-many",
            "foreignField": "projectId",
            "description": "项目包含多个合作记录"
        }
    ]
}
```

### 12.2 `aw_collaborations.doc.json`

```json
{
    "collection": "aw_collaborations",
    "description": "合作记录集合 - 项目内的达人合作订单",
    "database": "agentworks_db",
    "version": "1.0",
    "lastUpdated": "2025-11-30",
    "author": "AgentWorks Team",
    "fields": {
        "_id": {
            "type": "ObjectId",
            "description": "MongoDB 文档 ID",
            "required": true,
            "auto": true
        },
        "id": {
            "type": "String",
            "description": "业务ID（唯一标识）",
            "required": true,
            "pattern": "^collab_[0-9]{13}_[a-z0-9]{6}$",
            "example": "collab_1234567890123_xyz789"
        },
        "projectId": {
            "type": "String",
            "description": "关联项目ID（aw_projects.id）",
            "required": true
        },
        "talentOneId": {
            "type": "String",
            "description": "达人统一ID（talents.oneId）",
            "required": true,
            "example": "talent_00000001"
        },
        "talentPlatform": {
            "type": "String",
            "description": "达人平台",
            "required": true,
            "enum": ["douyin", "xiaohongshu", "bilibili", "kuaishou"]
        },
        "talentName": {
            "type": "String",
            "description": "达人昵称（冗余字段）",
            "required": false
        },
        "talentSource": {
            "type": "String",
            "description": "达人来源",
            "required": false,
            "enum": ["机构达人", "独立达人", "客户指定"]
        },
        "status": {
            "type": "String",
            "description": "合作状态",
            "required": true,
            "enum": ["待提报工作台", "工作台已提交", "客户已定档", "视频已发布"],
            "default": "待提报工作台"
        },
        "orderType": {
            "type": "String",
            "description": "订单类型",
            "required": false,
            "enum": ["new", "modified", "cancelled"],
            "default": "new"
        },
        "amount": {
            "type": "Integer",
            "description": "执行金额（单位：分）",
            "required": true,
            "min": 0
        },
        "priceInfo": {
            "type": "String",
            "description": "价格档期说明",
            "required": false,
            "example": "2025年12月"
        },
        "rebateRate": {
            "type": "Double",
            "description": "返点率（%）",
            "required": false,
            "min": 0,
            "max": 100
        },
        "actualRebate": {
            "type": "Integer",
            "description": "实际返点金额（分）",
            "required": false
        },
        "plannedReleaseDate": {
            "type": "String",
            "description": "计划发布日期（YYYY-MM-DD）",
            "required": false
        },
        "actualReleaseDate": {
            "type": "String",
            "description": "实际发布日期（YYYY-MM-DD）",
            "required": false
        },
        "taskId": {
            "type": "String",
            "description": "星图任务ID",
            "required": false
        },
        "videoId": {
            "type": "String",
            "description": "视频ID",
            "required": false
        },
        "videoUrl": {
            "type": "String",
            "description": "视频链接",
            "required": false
        },
        "orderDate": {
            "type": "String",
            "description": "下单日期（YYYY-MM-DD）",
            "required": false
        },
        "paymentDate": {
            "type": "String",
            "description": "打款日期（YYYY-MM-DD）",
            "required": false
        },
        "recoveryDate": {
            "type": "String",
            "description": "回款日期（YYYY-MM-DD）",
            "required": false
        },
        "discrepancyReason": {
            "type": "String",
            "description": "差异原因",
            "required": false
        },
        "rebateScreenshots": {
            "type": "Array",
            "description": "返点截图URL",
            "required": false,
            "itemType": "String"
        },
        "effectData": {
            "type": "Object",
            "description": "效果数据",
            "required": false,
            "properties": {
                "t7": {
                    "type": "Object",
                    "description": "T+7 数据",
                    "properties": {
                        "plays": { "type": "Integer" },
                        "likes": { "type": "Integer" },
                        "comments": { "type": "Integer" },
                        "shares": { "type": "Integer" },
                        "cpm": { "type": "Double" },
                        "recordedAt": { "type": "Date" }
                    }
                },
                "t21": {
                    "type": "Object",
                    "description": "T+21 数据",
                    "properties": {
                        "plays": { "type": "Integer" },
                        "likes": { "type": "Integer" },
                        "comments": { "type": "Integer" },
                        "shares": { "type": "Integer" },
                        "cpm": { "type": "Double" },
                        "recordedAt": { "type": "Date" }
                    }
                }
            }
        },
        "adjustments": {
            "type": "Array",
            "description": "合作级别调整项",
            "required": false,
            "default": [],
            "itemType": "Object",
            "itemSchema": {
                "id": { "type": "String", "required": true },
                "type": { "type": "String", "enum": ["价格调整", "其他"] },
                "amount": { "type": "Integer" },
                "reason": { "type": "String" }
            }
        },
        "createdAt": { "type": "Date", "required": true, "default": "now" },
        "updatedAt": { "type": "Date", "required": true, "default": "now" }
    },
    "indexes": [
        { "name": "idx_id", "fields": { "id": 1 }, "unique": true },
        { "name": "idx_projectId", "fields": { "projectId": 1 } },
        { "name": "idx_talent", "fields": { "talentOneId": 1, "talentPlatform": 1 } },
        { "name": "idx_status", "fields": { "status": 1 } },
        { "name": "idx_plannedReleaseDate", "fields": { "plannedReleaseDate": 1 } },
        { "name": "idx_actualReleaseDate", "fields": { "actualReleaseDate": 1 } },
        { "name": "idx_project_platform", "fields": { "projectId": 1, "talentPlatform": 1 } }
    ],
    "relations": [
        {
            "collection": "aw_projects",
            "type": "many-to-one",
            "localField": "projectId",
            "foreignField": "id",
            "description": "合作记录属于项目"
        },
        {
            "collection": "talents",
            "type": "many-to-one",
            "localField": ["talentOneId", "talentPlatform"],
            "foreignField": ["oneId", "platform"],
            "description": "合作记录关联达人"
        }
    ]
}
```

---

## 十三、组件详细规格

### 13.1 项目列表页 (ProjectList)

#### 表格列定义
| 列名 | 字段 | 宽度 | 类型 | 说明 |
|------|------|------|------|------|
| 项目名称 | name | 200 | text + link | 点击跳转详情页 |
| 客户 | customerName | 120 | text | - |
| 平台 | platforms | 150 | tags | 多平台标签 |
| 状态 | status | 100 | badge | 状态颜色标识 |
| 预算 | budget | 120 | money | 格式化金额 |
| 合作数 | stats.collaborationCount | 80 | number | - |
| 进度 | - | 120 | progress | 已发布/总数 |
| 创建时间 | createdAt | 150 | date | YYYY-MM-DD |
| 操作 | - | 150 | actions | 查看/编辑/删除 |

#### 筛选器
```typescript
interface ProjectListFilters {
  keyword?: string;        // 项目名称搜索
  status?: ProjectStatus;  // 状态下拉
  customerId?: string;     // 客户下拉（远程搜索）
  year?: number;           // 年份选择器
  month?: number;          // 月份选择器
  platforms?: Platform[];  // 平台多选
}
```

#### 操作按钮
- **新建项目**：打开 ProjectFormModal
- **导出**：导出当前筛选结果为 Excel（Phase 2）

---

### 13.2 项目表单弹窗 (ProjectFormModal)

#### 表单字段
| 字段 | 组件 | 必填 | 说明 |
|------|------|------|------|
| 项目名称 | Input | ✓ | 最大 100 字符 |
| 客户 | Select (远程搜索) | ✓ | 选择后加载项目类型 |
| 项目类型 | Select | ✓ | 依赖客户选择 |
| 投放平台 | Checkbox.Group | ✓ | 至少选择一个 |
| 年份 | Select | ✓ | 默认当前年 |
| 月份 | Select | ✓ | 默认当前月 |
| 预算 | InputNumber | ✓ | 单位元，自动转分 |
| 折扣率 | InputNumber | - | 0-100% |
| 基准CPM | InputNumber | - | - |
| 千川ID | Input | - | - |

#### 联动逻辑
```
选择客户 → 加载客户的 projectTypeConfig → 更新项目类型选项
```

---

### 13.3 合作达人 Tab (CollaborationsTab)

#### 表格列定义
| 列名 | 字段 | 宽度 | 可编辑 | 说明 |
|------|------|------|--------|------|
| 达人 | talentName | 150 | - | 显示头像+昵称 |
| 平台 | talentPlatform | 80 | - | 平台图标 |
| 状态 | status | 120 | ✓ Select | 下拉切换 |
| 执行金额 | amount | 120 | ✓ | 金额输入 |
| 计划发布 | plannedReleaseDate | 120 | ✓ DatePicker | - |
| 返点率 | rebateRate | 80 | - | 来自达人配置 |
| 来源 | talentSource | 100 | - | - |
| 操作 | - | 100 | - | 编辑/删除 |

#### 操作功能
- **添加达人**：打开 TalentSelectorModal（复用现有组件）
- **批量操作**：批量设置状态/计划发布日期
- **删除**：二次确认后删除

---

### 13.4 执行追踪 Tab (ExecutionTab)

#### KPI 面板
```
┌────────────┬────────────┬────────────┬────────────┐
│ 计划发布    │ 已发布     │ 发布率     │ 延期       │
│    15      │    12      │   80%      │    2       │
└────────────┴────────────┴────────────┴────────────┘
```

#### 表格列（按发布日期排序）
| 列名 | 字段 | 可编辑 |
|------|------|--------|
| 达人 | talentName | - |
| 平台 | talentPlatform | - |
| 计划发布 | plannedReleaseDate | ✓ |
| 实际发布 | actualReleaseDate | ✓ |
| 状态 | - | - | 计算：延期/已发布/待发布 |
| 任务ID | taskId | ✓ |
| 视频链接 | videoUrl | ✓ |

---

### 13.5 财务管理 Tab (FinancialTab)

#### 汇总面板
```
┌────────────┬────────────┬────────────┬────────────┐
│ 执行总额    │ 返点总额   │ 已下单     │ 已回款     │
│  ¥350万    │  ¥52.5万   │  ¥280万    │  ¥200万    │
└────────────┴────────────┴────────────┴────────────┘
```

#### 表格列
| 列名 | 字段 | 可编辑 |
|------|------|--------|
| 达人 | talentName | - |
| 执行金额 | amount | ✓ |
| 返点率 | rebateRate | - |
| 返点金额 | actualRebate | - | 计算值 |
| 下单日期 | orderDate | ✓ |
| 打款日期 | paymentDate | ✓ |
| 回款日期 | recoveryDate | ✓ |
| 调整项 | adjustments | ✓ | 弹窗编辑 |

#### 批量操作
- 批量设置下单日期
- 批量设置回款日期

---

### 13.6 效果验收 Tab (EffectTab)

#### 子 Tab
- **T+7 数据**
- **T+21 数据**

#### 效果看板（T+7 为例）
```
┌────────────┬────────────┬────────────┬────────────┐
│ 总播放量    │ 总互动量   │ 平均CPM    │ 达成率     │
│  3000万    │  120万     │  12.5      │   85%      │
└────────────┴────────────┴────────────┴────────────┘
```

#### 表格列
| 列名 | 字段 | 可编辑 |
|------|------|--------|
| 达人 | talentName | - |
| 播放量 | effectData.t7.plays | ✓ |
| 点赞 | effectData.t7.likes | ✓ |
| 评论 | effectData.t7.comments | ✓ |
| 转发 | effectData.t7.shares | ✓ |
| CPM | effectData.t7.cpm | - | 计算值 |
| 录入时间 | effectData.t7.recordedAt | - |

---

## 十四、错误处理与数据校验

### 14.1 前端数据校验规则

#### 项目表单校验
```typescript
const projectFormRules = {
  name: [
    { required: true, message: '请输入项目名称' },
    { max: 100, message: '项目名称不能超过100字符' },
  ],
  customerId: [
    { required: true, message: '请选择客户' },
  ],
  type: [
    { required: true, message: '请选择项目类型' },
  ],
  platforms: [
    { required: true, message: '请选择至少一个投放平台', type: 'array', min: 1 },
  ],
  budget: [
    { required: true, message: '请输入项目预算' },
    { type: 'number', min: 0, message: '预算不能为负数' },
  ],
  year: [
    { required: true, message: '请选择年份' },
  ],
  month: [
    { required: true, message: '请选择月份' },
  ],
};
```

#### 合作记录校验
```typescript
const collaborationFormRules = {
  talentOneId: [
    { required: true, message: '请选择达人' },
  ],
  amount: [
    { required: true, message: '请输入执行金额' },
    { type: 'number', min: 0, message: '金额不能为负数' },
  ],
  plannedReleaseDate: [
    { pattern: /^\d{4}-\d{2}-\d{2}$/, message: '日期格式错误' },
  ],
};
```

### 14.2 API 错误处理

#### 统一错误响应格式
```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;      // 错误代码
    message: string;   // 用户友好消息
    details?: any;     // 详细信息（开发用）
  };
}
```

#### 错误代码定义
| 代码 | 说明 | 前端处理 |
|------|------|----------|
| PROJECT_NOT_FOUND | 项目不存在 | 提示并返回列表 |
| CUSTOMER_NOT_FOUND | 客户不存在 | 提示刷新客户列表 |
| TALENT_NOT_FOUND | 达人不在库中 | 提示前往新增达人 |
| DUPLICATE_COLLABORATION | 重复的达人合作 | 提示已存在 |
| INVALID_STATUS_TRANSITION | 状态流转错误 | 提示当前状态不允许此操作 |
| BUDGET_EXCEEDED | 预算超限 | 警告提示 |

### 14.3 前端错误处理模式

```typescript
// API 调用统一封装
async function callApi<T>(
  apiMethod: () => Promise<ApiResponse<T>>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<T | null> {
  try {
    const response = await apiMethod();
    if (response.success) {
      if (options?.successMessage) {
        message.success(options.successMessage);
      }
      return response.data;
    } else {
      message.error(response.message || options?.errorMessage || '操作失败');
      return null;
    }
  } catch (error) {
    console.error('API Error:', error);
    message.error(options?.errorMessage || '网络错误，请稍后重试');
    return null;
  }
}

// 使用示例
const project = await callApi(
  () => projectApi.createProject(formData),
  { successMessage: '项目创建成功' }
);
```

---

## 十五、权限与安全（预留）

### 15.1 操作权限设计（后续实现）

| 操作 | 权限 | 说明 |
|------|------|------|
| 查看项目列表 | project:read | 默认开放 |
| 创建项目 | project:create | - |
| 编辑项目 | project:update | - |
| 删除项目 | project:delete | 需二次确认 |
| 添加合作 | collaboration:create | - |
| 编辑合作 | collaboration:update | - |
| 删除合作 | collaboration:delete | - |
| 财务数据 | finance:read | 敏感数据 |
| 修改财务 | finance:update | 高权限 |

### 15.2 数据安全

- **金额存储**：所有金额以「分」存储，避免浮点精度问题
- **敏感字段**：财务相关字段需要权限控制
- **审计日志**：关键操作记录到 auditLog
- **软删除**：删除操作改为状态变更，支持恢复

---

## 十六、测试检查清单

### 16.1 功能测试

#### 项目管理
- [ ] 创建项目：必填项校验、客户联动项目类型
- [ ] 编辑项目：数据回显、更新保存
- [ ] 删除项目：二次确认、关联合作处理
- [ ] 列表筛选：各筛选条件组合测试
- [ ] 分页：翻页、每页数量切换

#### 合作管理
- [ ] 添加达人：搜索、选择、达人不存在提示
- [ ] 状态流转：各状态间切换
- [ ] 批量操作：批量设置日期
- [ ] 平台筛选：Tab 间数据独立

#### 财务管理
- [ ] 金额计算：返点金额自动计算
- [ ] 日期设置：批量设置下单/回款日期
- [ ] 调整项：添加/删除调整项

### 16.2 边界测试
- [ ] 空数据：无项目/无合作时的空状态
- [ ] 大数据：100+ 合作记录的性能
- [ ] 并发：多人同时编辑同一项目
- [ ] 网络异常：断网/超时处理

---

**文档版本**: v1.1
**创建日期**: 2025-11-30
**最后更新**: 2025-11-30
**维护团队**: AgentWorks Team
