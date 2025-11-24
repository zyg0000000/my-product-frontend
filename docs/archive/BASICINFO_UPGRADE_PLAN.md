# BasicInfo 页面升级计划

> **达人基础信息页面完整升级为 Ant Design Pro 风格**
>
> **状态**: 📋 待实施
> **优先级**: ⭐⭐⭐⭐⭐ 最高优先级（核心业务页面）
> **创建时间**: 2025-11-23

---

## 📊 现状分析

### 文件信息
- **文件**: `src/pages/Talents/BasicInfo/BasicInfo.tsx`
- **代码行数**: 1076 行
- **复杂度**: 高（包含搜索、筛选、分页、操作菜单等）

### 当前问题

| 问题类型 | 具体问题 | 位置 |
|---------|---------|------|
| **手写表格** | 使用 `<table>` 标签 | 第 755 行 |
| **手写 Tabs** | 使用 `border-b-2` 手写平台切换 | 第 487-503 行 |
| **违规代码** | 使用 `alert()` | 第 1040 行 |
| **手写菜单** | 使用 `fixed inset-0` 定位菜单 | 第 1013 行 |
| **Toast** | 使用旧的 useToast hook | 第 91 行 |

### 页面功能清单

**核心功能**：
- ✅ 多平台切换（抖音、小红书、B站、快手）
- ✅ 搜索功能（按名称/OneID）
- ✅ 高级筛选（等级、标签、返点、价格范围）
- ✅ 价格档位选择器（localStorage 持久化）
- ✅ 分页功能（15条/页）
- ✅ 达人列表展示

**操作功能**：
- ✅ 编辑达人
- ✅ 删除达人
- ✅ 管理价格
- ✅ 管理返点
- ✅ 查看详情
- ✅ 查看合作历史（开发中）

**弹窗组件**（已升级）：
- ✅ EditTalentModal（Ant Design Pro）
- ✅ DeleteConfirmModal（Ant Design）
- ✅ PriceModal（Ant Design Pro）
- ✅ RebateManagementModal（Ant Design Pro）

---

## 🎯 升级方案

### 方案：完全重写为 ProTable 版本

**原因**：
1. 文件太大（1076行），逐行修改容易出错
2. 表格逻辑复杂，直接用 ProTable 更清晰
3. 可以参考 PerformanceHome 的成熟方案
4. 保留旧文件作为备份，风险可控

**策略**：
- 创建 `BasicInfo_v2.tsx`（新文件）
- 使用 ProTable 重构表格部分
- 保留所有业务逻辑和 Hooks
- 测试通过后替换原文件

---

## 🏗️ 升级架构设计

### 新版页面结构

```typescript
BasicInfo_v2.tsx (预计 400-500 行)

├─ 导入依赖
│  ├─ ProTable, ProCard
│  ├─ Tabs, Button, Dropdown, Space, Tag, message
│  └─ 已升级的弹窗组件

├─ 状态管理
│  ├─ 平台选择: selectedPlatform
│  ├─ 价格档位: selectedPriceTier
│  ├─ 筛选条件: filters (对象)
│  ├─ 弹窗状态: modals (对象)
│  └─ 达人数据: talents, loading, total

├─ ProTable 列配置
│  ├─ 达人名称（固定左侧，带链接）
│  ├─ OneID
│  ├─ 粉丝数
│  ├─ 价格（根据选中档位）
│  ├─ 返点率
│  ├─ 等级
│  ├─ 标签
│  ├─ 机构
│  └─ 操作（固定右侧，Dropdown）

├─ 页面布局
│  ├─ 页面标题（Tailwind）
│  ├─ 平台 Tabs（Ant Design）
│  ├─ 筛选面板（ProCard）
│  └─ ProTable

└─ 弹窗组件
   ├─ EditTalentModal
   ├─ DeleteConfirmModal
   ├─ PriceModal
   └─ RebateManagementModal
```

### ProTable 列定义示例

```typescript
const columns: ProColumns<Talent>[] = useMemo(() => [
  {
    title: '达人名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    fixed: 'left',
    ellipsis: true,
    render: (_, record) => {
      const link = getPlatformLink(record);
      return link ? (
        <a href={link} target="_blank" className="text-blue-600 hover:text-blue-800">
          {record.name}
        </a>
      ) : (
        <span>{record.name}</span>
      );
    },
  },
  {
    title: 'OneID',
    dataIndex: 'oneId',
    width: 150,
    ellipsis: true,
  },
  {
    title: '粉丝数',
    dataIndex: 'fansCount',
    width: 120,
    sorter: true,
    render: (count: number) => count?.toLocaleString() || 'N/A',
  },
  {
    title: `${selectedPriceTier} 价格`,
    key: 'price',
    width: 120,
    render: (_, record) => {
      const price = getLatestPrice(record, selectedPriceTier);
      return price ? formatPrice(price) : 'N/A';
    },
  },
  {
    title: '返点',
    key: 'rebate',
    width: 100,
    render: (_, record) => formatRebate(record.currentRebate?.rate),
  },
  {
    title: '等级',
    dataIndex: 'talentTier',
    width: 100,
    render: (tier: string) => tier ? <Tag>{tier}</Tag> : 'N/A',
  },
  {
    title: '标签',
    dataIndex: 'talentType',
    width: 150,
    render: (tags: string[]) => (
      <Space size="small" wrap>
        {tags?.slice(0, 2).map(tag => <Tag key={tag}>{tag}</Tag>)}
        {tags?.length > 2 && <Tag>+{tags.length - 2}</Tag>}
      </Space>
    ),
  },
  {
    title: '机构',
    dataIndex: 'agencyName',
    width: 120,
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (_, record) => (
      <Dropdown
        menu={{
          items: [
            { key: 'edit', label: '编辑', icon: <EditOutlined /> },
            { key: 'price', label: '价格', icon: <DollarOutlined /> },
            { key: 'rebate', label: '返点', icon: <PercentageOutlined /> },
            { key: 'detail', label: '详情', icon: <EyeOutlined /> },
            { type: 'divider' },
            { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
          ],
          onClick: ({ key }) => handleMenuClick(key, record),
        }}
      >
        <Button type="link" size="small">
          操作 <DownOutlined />
        </Button>
      </Dropdown>
    ),
  },
], [selectedPlatform, selectedPriceTier]);
```

---

## 🔄 升级步骤

### Step 1: 创建新文件（1小时）

**任务**：
1. 创建 `BasicInfo_v2.tsx`
2. 复制必要的状态和业务逻辑
3. 实现 ProTable 列配置
4. 保留所有筛选功能

**产出**：
- 新的 ProTable 版本文件
- 代码量：约 400-500 行（减少 50%）

---

### Step 2: 升级 UI 组件（30分钟）

**替换内容**：

| 旧组件 | 新组件 | 改造内容 |
|--------|--------|---------|
| 手写 Tab 导航 | Ant Design Tabs | 平台切换 |
| 手写表格 | ProTable | 达人列表 |
| 手写操作菜单 | Dropdown | 操作下拉菜单 |
| 手写按钮 | Button | 新增达人按钮 |
| useToast | message API | 通知提示 |
| alert() | message.info() | 违规修复 |

---

### Step 3: 保留功能（30分钟）

**保留的重要功能**：

1. **搜索筛选**
   - 基础搜索框
   - 高级筛选面板（ProCard）
   - 筛选条件保持不变

2. **价格档位选择**
   - 档位选择器（Select 组件）
   - localStorage 持久化
   - 动态显示价格列

3. **分页**
   - ProTable 内置分页
   - 保持 15条/页
   - 保持总数显示

4. **弹窗**
   - 已升级的弹窗组件
   - 功能完全不变

---

### Step 4: 测试验证（30分钟）

**测试清单**：
- [ ] 平台切换正常
- [ ] 搜索功能正常
- [ ] 高级筛选正常
- [ ] 价格档位切换正常
- [ ] 分页功能正常
- [ ] 编辑达人正常
- [ ] 删除达人正常
- [ ] 管理价格正常
- [ ] 管理返点正常
- [ ] 查看详情跳转正常
- [ ] 操作菜单下拉正常

---

## 📐 关键改造点

### 1. 平台 Tabs

**改造前**：
```tsx
<div className="border-b border-gray-200">
  <nav className="-mb-px flex space-x-8">
    {platforms.map(platform => (
      <button
        className="border-b-2 ..."
      >
        {PLATFORM_NAMES[platform]}
      </button>
    ))}
  </nav>
</div>
```

**改造后**：
```tsx
<Tabs
  activeKey={selectedPlatform}
  onChange={(key) => setSelectedPlatform(key as Platform)}
  items={platforms.map(platform => ({
    key: platform,
    label: PLATFORM_NAMES[platform],
  }))}
/>
```

### 2. 数据表格

**改造前**：
```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead>...</thead>
  <tbody>
    {talents.map(talent => (
      <tr>...</tr>
    ))}
  </tbody>
</table>
```

**改造后**：
```tsx
<ProTable
  columns={columns}
  dataSource={talents}
  rowKey="oneId"
  loading={loading}
  pagination={{
    current: currentPage,
    pageSize: 15,
    total: totalTalents,
  }}
  search={false}
  toolbar={{
    actions: [
      <Button type="primary" onClick={...}>新增达人</Button>,
      <PriceTierSelector />,
    ],
  }}
/>
```

### 3. 操作菜单

**改造前**：
```tsx
<div className="fixed inset-0 ..." onClick={closeMenu}>
  <div className="absolute ..." style={{ top, left }}>
    <button>编辑</button>
    <button>价格</button>
    ...
  </div>
</div>
```

**改造后**：
```tsx
<Dropdown
  menu={{
    items: [
      { key: 'edit', label: '编辑', icon: <EditOutlined /> },
      { key: 'price', label: '价格', icon: <DollarOutlined /> },
      { key: 'rebate', label: '返点', icon: <PercentageOutlined /> },
      { key: 'detail', label: '详情', icon: <EyeOutlined /> },
      { type: 'divider' },
      { key: 'delete', label: '删除', danger: true },
    ],
  }}
>
  <Button type="link" size="small">操作</Button>
</Dropdown>
```

### 4. 筛选面板

**保留原有逻辑，使用 ProCard 包裹**：
```tsx
<ProCard title="高级筛选" collapsible defaultCollapsed>
  {/* 保留原有的筛选UI */}
</ProCard>
```

---

## 💰 预期收益

### 代码减少
- 当前：1076 行
- 升级后：约 450-500 行
- **减少**: 50%+

### 功能提升
| 功能 | 改造前 | 改造后 |
|------|--------|--------|
| 表格排序 | 手写逻辑 | ProTable 内置 |
| 列显示/隐藏 | 无 | ProTable 内置 |
| 刷新功能 | 无 | ProTable 内置 |
| 操作菜单 | 手写定位 | Dropdown 自动 |
| 加载状态 | 手写 spinner | ProTable 内置 |
| 空状态 | 手写提示 | ProTable 内置 |

### 用户体验提升
- ✅ 统一的视觉风格
- ✅ 更流畅的交互动画
- ✅ 更专业的操作菜单
- ✅ 更智能的表格功能

---

## ⚙️ 实施计划

### Phase 1: 准备工作（15分钟）

**任务**：
- [ ] 备份当前文件：`BasicInfo.tsx` → `BasicInfo_old.tsx`
- [ ] 创建新文件：`BasicInfo_v2.tsx`
- [ ] 分析并记录所有状态和业务逻辑

---

### Phase 2: 核心重构（1.5小时）

**2.1 搭建页面框架**（20分钟）
- [ ] 导入必要的依赖
- [ ] 复制状态定义
- [ ] 实现数据加载逻辑
- [ ] 搭建页面布局（标题 + Tabs）

**2.2 实现 ProTable**（40分钟）
- [ ] 定义列配置（columns）
- [ ] 实现排序逻辑
- [ ] 实现价格列动态显示
- [ ] 实现操作 Dropdown
- [ ] 配置分页器

**2.3 实现筛选功能**（30分钟）
- [ ] 搜索框（ProCard包裹）
- [ ] 高级筛选面板
- [ ] 筛选逻辑保持不变
- [ ] 重置功能

---

### Phase 3: 功能集成（45分钟）

**3.1 价格档位选择器**（15分钟）
- [ ] 使用 Select 组件
- [ ] 保持 localStorage 持久化
- [ ] 集成到 toolbar

**3.2 操作菜单**（15分钟）
- [ ] 使用 Dropdown 组件
- [ ] 实现菜单项点击逻辑
- [ ] 添加图标

**3.3 弹窗集成**（15分钟）
- [ ] 保持现有弹窗组件不变
- [ ] 集成所有弹窗
- [ ] 测试弹窗交互

---

### Phase 4: 细节优化（30分钟）

**4.1 修复违规代码**
- [ ] 替换 `alert()` 为 `message.info()`
- [ ] 替换 useToast 为 message API
- [ ] 移除手写菜单定位逻辑

**4.2 样式优化**
- [ ] 统一按钮样式
- [ ] 统一标签颜色
- [ ] 优化间距和布局

**4.3 加载和空状态**
- [ ] ProTable loading
- [ ] ProTable empty state
- [ ] 筛选无结果提示

---

### Phase 5: 测试部署（30分钟）

- [ ] 功能测试（完整测试清单）
- [ ] 性能测试（大数据量）
- [ ] 兼容性测试
- [ ] 备份旧文件
- [ ] 替换为新版本

---

## 📋 详细功能对照表

### 表格列对照

| 列名 | 当前实现 | ProTable 实现 | 特殊处理 |
|------|---------|--------------|---------|
| 达人名称 | `<td>` | ProColumns | 外链渲染 |
| OneID | `<td>` | ProColumns | 可复制 |
| 粉丝数 | `<td>` | ProColumns | 千分位格式化 |
| 价格 | `<td>` | ProColumns | 动态列，根据档位 |
| 返点 | `<td>` | ProColumns | 百分比格式化 |
| 等级 | `<td>` | ProColumns | Tag 组件 |
| 标签 | `<td>` | ProColumns | Tag 列表 |
| 机构 | `<td>` | ProColumns | 文本 |
| 操作 | `<td>` + 手写菜单 | ProColumns | Dropdown |

### 操作功能对照

| 操作 | 当前实现 | ProTable 实现 |
|------|---------|--------------|
| 编辑 | 菜单项 + Modal | Dropdown + Modal |
| 价格 | 菜单项 + Modal | Dropdown + Modal |
| 返点 | 菜单项 + Modal | Dropdown + Modal |
| 详情 | 菜单项 + Navigate | Dropdown + Navigate |
| 删除 | 菜单项 + Modal | Dropdown + Modal |
| 合作历史 | 菜单项 + alert | Dropdown + message |

---

## ⏱️ 预计工时

| 阶段 | 工作内容 | 预计时间 |
|------|---------|---------|
| Phase 1 | 准备工作 | 15分钟 |
| Phase 2 | 核心重构 | 1.5小时 |
| Phase 3 | 功能集成 | 45分钟 |
| Phase 4 | 细节优化 | 30分钟 |
| Phase 5 | 测试部署 | 30分钟 |
| **总计** | | **3.5小时** |

---

## 🎯 成功标准

### 功能完整性
- ✅ 所有现有功能 100% 正常
- ✅ 性能不下降
- ✅ 无新增 bug

### UI 规范合规
- ✅ 使用 ProTable
- ✅ 使用 Ant Design Tabs
- ✅ 使用 Dropdown
- ✅ 无 alert/confirm/prompt
- ✅ 使用 message API

### 代码质量
- ✅ 代码减少 50%
- ✅ TypeScript 零错误
- ✅ ESLint 零警告

---

## 🚧 风险控制

### 风险评估

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| ProTable 配置错误 | 中 | 中 | 参考 PerformanceHome 成熟方案 |
| 筛选功能失效 | 低 | 高 | 保留原有筛选逻辑不变 |
| 分页计算错误 | 低 | 中 | 使用 ProTable 内置分页 |
| 操作菜单定位问题 | 低 | 低 | Dropdown 自动处理 |

### 回滚方案
```bash
# 如果新版本有问题，立即回滚
mv BasicInfo_v2.tsx BasicInfo_failed.tsx
mv BasicInfo_old.tsx BasicInfo.tsx
```

---

## 📚 参考文档

### 成功案例参考
- ✅ PerformanceHome.tsx（ProTable 最佳实践）
- ✅ AgenciesList.tsx（ProTable + 操作按钮）
- ✅ CustomerList.tsx（ProTable + Dropdown）

### 技术文档
- UI_UX_GUIDELINES.md v3.0
- COMPONENT_LIBRARY.md
- DEVELOPMENT_GUIDELINES.md

---

## 🎉 升级后效果预览

### 视觉效果
```
┌─────────────────────────────────────────┐
│ 基础信息                   [+ 新增达人]  │
│ 管理多平台达人信息、价格和返点           │
├─────────────────────────────────────────┤
│ ┌─────┬────────┬────┬────┐            │
│ │抖音 │小红书  │B站 │快手│  ← Ant Design Tabs
│ └─────┴────────┴────┴────┘            │
├─────────────────────────────────────────┤
│ 🔍 [搜索框]  [高级筛选▼]              │
├─────────────────────────────────────────┤
│                                         │
│  ProTable 数据表格                      │
│  ┌──────┬──────┬──────┬──────┬──────┐ │
│  │ 名称 │OneID │粉丝  │价格  │操作  │ │
│  ├──────┼──────┼──────┼──────┼──────┤ │
│  │ ...  │ ...  │ ...  │ ...  │[▼]  │ │
│  └──────┴──────┴──────┴──────┴──────┘ │
│                                         │
│  [← 上一页]  1/10  [下一页 →]         │
└─────────────────────────────────────────┘
```

---

**创建时间**: 2025-11-23
**预计完成时间**: 3.5 小时
**维护者**: AgentWorks 团队

🎯 **下次开始时的第一个任务**：升级 BasicInfo 页面！
