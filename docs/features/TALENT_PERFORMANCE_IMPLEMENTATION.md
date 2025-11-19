# 达人近期表现页面 - 实施计划

> **版本**: v1.0
> **工作量**: 9天
> **状态**: ⏳ 待开始

---

## 🎯 实施概览

**5个阶段，9天完成**

| 阶段 | 任务 | 工作量 | 产出 |
|------|------|:------:|------|
| **Phase 1** | 数据库准备 | 0.5天 | Schema + 初始配置 |
| **Phase 2** | 云函数开发 | 2天 | 3个云函数 |
| **Phase 3** | 配置管理界面 | 2天 | 可视化管理 |
| **Phase 4** | 表现页面 | 2天 | 列表展示 |
| **Phase 5** | 数据导入 | 1.5天 | 飞书/Excel导入 |
| **Phase 6** | 完善测试 | 1天 | 测试和优化 |

---

## 📋 Phase 1: 数据库准备（0.5天）

### 任务清单

- [ ] 1.1 创建 field_mappings 集合
  - Schema 设计
  - 创建索引
  - 插入抖音默认配置（20个映射规则）

- [ ] 1.2 创建 dimension_configs 集合
  - Schema 设计
  - 创建索引
  - 插入抖音默认配置（20个维度）

- [ ] 1.3 验证配置数据

### 产出
- 数据库初始化脚本
- 抖音默认配置数据

---

## 📋 Phase 2: 云函数开发（2天）

### 任务清单

- [ ] 2.1 **升级 syncFromFeishu v11.4.3 → v12.0**（1.5天）
  - 重构 utils.js 为4个模块
    - `feishu-api.js`（飞书API层）
    - `mapping-engine.js`（映射引擎）
    - `data-processors/talent-performance.js`（业务处理）
    - `utils.js`（通用工具）
  - 实现从数据库读取映射配置
  - 实现通用映射引擎
  - 支持 v2 数据库（agentworks_db）
  - 支持 performanceData.crowdPackage 写入
  - 保持 v1 完全兼容
  - 编写剥离文档（README.md）
  - 测试 v1 兼容性

- [ ] 2.2 **创建 fieldMappingManager**（0.25天）
  - RESTful API（GET/POST/PUT/DELETE）
  - 操作 field_mappings 集合

- [ ] 2.3 **创建 dimensionConfigManager**（0.25天）
  - RESTful API（GET/POST/PUT/DELETE）
  - 操作 dimension_configs 集合

### 产出
- syncFromFeishu v12.0（模块化，可剥离）
- fieldMappingManager
- dimensionConfigManager

---

## 📋 Phase 3: 配置管理界面（2天）

### 任务清单

- [ ] 3.1 创建页面路由（0.5天）
  - `/settings/performance-config`
  - Tab切换（字段映射 / 维度管理）

- [ ] 3.2 **FieldMappingManager 组件**（1天）
  - 映射规则列表（表格）
  - 添加/编辑/删除映射
  - 平台切换
  - 测试映射功能（上传样本）

- [ ] 3.3 **DimensionManager 组件**（0.5天）
  - 维度列表（可拖拽排序，dnd-kit）
  - 显示/隐藏切换
  - 添加/编辑/删除维度

- [ ] 3.4 API 和 Hooks
  - `api/performance.ts`
  - `useFieldMapping` Hook
  - `useDimensionConfig` Hook

### 产出
- 配置管理页面

---

## 📋 Phase 4: 达人表现页面（2天）

### 任务清单

- [ ] 4.1 创建页面结构（0.5天）
  - `/performance` 路由
  - PerformanceHome 主页面
  - 平台Tab切换

- [ ] 4.2 **PerformanceTable 组件**（1天）
  - 基于配置动态渲染列
  - 单元格格式化（number/percentage/date）
  - 排序功能
  - 加载状态

- [ ] 4.3 集成数据加载（0.5天）
  - 复用 useTalentData Hook
  - 加载带 performanceData 的达人
  - 分页功能（复用 Pagination）
  - 统计卡片（总数、平均CPM等）

### 产出
- 达人表现页面（列表完整）

---

## 📋 Phase 5: 数据导入功能（1.5天）

### 任务清单

- [ ] 5.1 **DataImportModal 组件**（1天）
  - 飞书URL输入
  - Excel文件上传
  - 数据预览（成功/失败）
  - 统计信息

- [ ] 5.2 **useDataImport Hook**（0.5天）
  - 调用 syncFromFeishu v12.0
  - 处理导入流程
  - 批量更新
  - 错误处理

### 产出
- 完整数据导入功能

---

## 📋 Phase 6: 完善测试（1天）

### 任务清单

- [ ] 6.1 功能测试
  - 列表展示
  - 配置管理
  - 数据导入
  - 排序分页

- [ ] 6.2 兼容性测试
  - ByteProject v1 不受影响
  - AgentWorks 功能正常

- [ ] 6.3 UI/UX 优化
  - 加载状态
  - 错误提示
  - 空状态处理

- [ ] 6.4 文档更新
  - CHANGELOG.md
  - API 文档

### 产出
- 完整可用功能

---

## 📊 工作量分配

```
Phase 1: ████░░░░░░  (0.5天, 6%)
Phase 2: ████████░░  (2天, 22%)
Phase 3: ████████░░  (2天, 22%)
Phase 4: ████████░░  (2天, 22%)
Phase 5: ██████░░░░  (1.5天, 17%)
Phase 6: ████░░░░░░  (1天, 11%)
───────────────────────────────
总计:    9天
```

---

## 🎯 关键里程碑

| 里程碑 | 完成时间 | 可演示内容 |
|--------|---------|-----------|
| **M1: 后端完成** | 2.5天后 | 可测试API和导入 |
| **M2: 配置管理** | 4.5天后 | 可在界面管理配置 |
| **M3: 基础列表** | 6.5天后 | 可查看达人表现 |
| **M4: 完整功能** | 9天后 | 所有功能可用 |

---

## 🔑 核心产出

### 可复用组件（5个）
1. PerformanceTable - 配置驱动表格
2. FieldMappingManager - 字段映射管理
3. DimensionManager - 维度管理
4. DataImportModal - 数据导入
5. StatsDashboard - 统计卡片

### 可复用Hooks（3个）
1. usePerformanceData
2. useFieldMapping
3. useDimensionConfig

### 云函数（3个）
1. syncFromFeishu v12.0（模块化，可剥离）
2. fieldMappingManager（RESTful）
3. dimensionConfigManager（RESTful）

---

## ✅ 验收标准

### 功能验收
- [ ] 抖音达人表现列表正常显示
- [ ] 20个维度可配置显示/隐藏
- [ ] 飞书导入功能正常
- [ ] Excel导入功能正常
- [ ] 配置管理界面可用
- [ ] 排序和分页功能正常

### 性能验收
- [ ] 列表加载 < 2秒
- [ ] 导入1000条数据 < 30秒
- [ ] 配置修改即时生效

### 兼容性验收
- [ ] ByteProject v1 不受影响
- [ ] AgentWorks 其他功能正常

### 可剥离性验收
- [ ] syncFromFeishu 模块化清晰
- [ ] 剥离文档完整
- [ ] 剥离成本 < 2天

---

**状态**: ⏳ 等待开始实施

🤖 Generated with [Claude Code](https://claude.com/claude-code)
