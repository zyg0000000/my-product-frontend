# AgentWorks 达人近期表现页面 - 设计方案讨论

> **创建日期**: 2025-11-18
> **状态**: 📝 方案讨论中
> **负责人**: Claude Code
> **目标**: 设计多平台达人表现数据管理页面

---

## 📋 目录

1. [需求分析](#需求分析)
2. [旧系统分析](#旧系统分析)
3. [核心挑战](#核心挑战)
4. [方案设计](#方案设计)
5. [技术架构](#技术架构)
6. [数据导入方案](#数据导入方案)
7. [代码效率优化](#代码效率优化)
8. [实施路线](#实施路线)
9. [待讨论问题](#待讨论问题)

---

## 🎯 需求分析

### 功能需求

#### 核心功能
1. **达人表现列表**
   - ✅ 分平台Tab展示（抖音、小红书、B站、快手）
   - ✅ 可配置的数据维度（列）
   - ✅ 排序功能
   - ✅ 分页展示
   - ⏳ 搜索功能（后续添加）

2. **数据导入**
   - ✅ 飞书表格导入（抖音）
   - ✅ Excel 文件导入
   - ✅ 数据预览和确认
   - ✅ 批量更新

3. **数据维度管理**
   - ✅ 可选择显示/隐藏列
   - ✅ 可排序列顺序
   - ✅ 保存用户配置

### 平台差异化

| 平台 | 优先级 | 数据维度特点 | 开发策略 |
|------|:------:|-------------|---------|
| **抖音** | 🔥 最高 | 参考 ByteProject，包含详细的受众分析 | 优先实现 |
| **小红书** | ⏳ 待定 | 图文/视频笔记数据，MCN 信息 | 预留接口 |
| **B站** | ⏳ 待定 | 播放量、弹幕、UP 主等级 | 预留接口 |
| **快手** | ⏳ 待定 | 视频数据 | 预留接口 |

---

## 📊 旧系统分析（ByteProject Performance）

### 架构特点

**模块化设计** (11 个模块，1,803 行):
```
performance/
├── constants.js (88行) - 常量定义
│   ├── PRESET_DIMENSIONS (预设维度配置)
│   └── COLUMN_MAP (Excel 字段映射)
├── import-export.js (277行) - 导入导出
│   ├── 飞书导入逻辑
│   ├── Excel 导入处理
│   └── 字段映射转换
├── table-renderer.js (158行) - 表格渲染
├── filter-panel.js (247行) - 筛选面板
├── modal-dimensions.js (198行) - 维度管理
└── ... 其他 6 个模块
```

### 核心数据维度（抖音）

**分类**: 5 大类，共 20+ 个维度

1. **基础信息** (5个):
   - 达人昵称、星图ID、UID、层级、类型

2. **核心绩效** (2个):
   - 60s+ 预期CPM、更新日期

3. **核心受众** (4个):
   - 男性/女性观众比例
   - 18-40岁/40岁以上观众占比

4. **年龄段粉丝比例** (5个):
   - 18-23岁、24-30岁、31-40岁、41-50岁、50岁以上

5. **人群包粉丝比例** (8个):
   - 小镇中老年、资深中产、Z世代、都市银发
   - 小镇青年、精致妈妈、新锐白领、都市蓝领

### 字段映射机制

**旧系统** (constants.js):
```javascript
export const COLUMN_MAP = {
    '达人昵称': { key: 'nickname', type: 'top' },
    '60s+预期CPM': { key: 'cpm60s', type: 'performance', format: 'number' },
    '男性观众比例': { key: 'maleAudienceRatio', type: 'performance', format: 'percentage' },
    // ... 20+ 个映射
};
```

**特点**:
- ✅ 硬编码映射关系
- ✅ 支持格式转换（number, percentage）
- ✅ 区分顶层字段（top）和性能数据（performance）
- ❌ 缺少灵活性，新增字段需要改代码
- ❌ 平台耦合，不支持多平台

### 导入流程

**飞书导入**:
```
1. 用户输入飞书表格 URL
2. 调用 syncFromFeishu 云函数
3. 云函数读取飞书表格，应用 COLUMN_MAP 映射
4. 返回处理后的数据
5. 前端展示预览，用户确认
6. 调用 bulkUpdateTalents 批量更新
```

**Excel 导入**:
```
1. 用户上传 Excel 文件
2. 前端解析 Excel（XLSX.js）
3. 应用 COLUMN_MAP 映射
4. 展示预览，用户确认
5. 调用 bulkUpdateTalents 批量更新
```

---

## 🚨 核心挑战

### 挑战 1: 多平台数据维度差异

**问题**:
- 抖音：20+ 个维度（受众分析详细）
- 小红书：不同的维度（图文/视频数据）
- B站：播放量、弹幕数等
- 快手：待定

**传统方案的问题**:
```typescript
// ❌ 硬编码每个平台的维度
const douyinDimensions = [{ id: 'cpm60s', ... }, ...];
const xiaohongshuDimensions = [{ id: 'videoCount', ... }, ...];
const bilibiliDimensions = [{ id: 'playCount', ... }, ...];

// 代码重复，难以维护
```

---

### 挑战 2: 字段映射的灵活性

**问题**:
- 旧系统：硬编码 `COLUMN_MAP`，新增字段需要改代码
- 飞书表格列名可能变化
- 不同平台的字段名不同

**需求**:
- 易于扩展新字段
- 支持自定义映射
- 减少代码修改

---

### 挑战 3: 代码复用性

**问题**:
- 如何在多平台间复用组件？
- 如何避免为每个平台写重复代码？
- 如何保持代码效率最高？

---

## 💡 方案设计

### 方案对比

#### 方案 A: 平台分离模式（传统）

**结构**:
```typescript
pages/Performance/
├── Douyin/
│   ├── DouyinPerformance.tsx    // 抖音专属页面
│   ├── douyinDimensions.ts      // 抖音维度配置
│   └── douyinFieldMap.ts        // 抖音字段映射
├── Xiaohongshu/
│   ├── XiaohongshuPerformance.tsx
│   ├── xiaohongshuDimensions.ts
│   └── xiaohongshuFieldMap.ts
└── ...
```

**优点**:
- ✅ 平台隔离，互不影响
- ✅ 简单直观

**缺点**:
- ❌ 代码重复率高（80%+）
- ❌ 每个平台都要重复写列表、导入、筛选逻辑
- ❌ 维护成本高
- ❌ 不符合"代码效率最高"的要求

**ROI 评分**: ⭐⭐ (不推荐)

---

#### 方案 B: 配置驱动模式（推荐）

**核心思想**: 抽象共性，配置差异

**结构**:
```typescript
pages/Performance/
├── PerformanceHome.tsx          // 主页面（通用）
├── components/
│   ├── PerformanceTable.tsx     // 通用表格组件
│   ├── DataImportModal.tsx      // 通用导入组件
│   ├── DimensionManager.tsx     // 通用维度管理
│   └── PlatformStats.tsx        // 通用统计卡片
├── config/
│   ├── platformDimensions.ts    // 平台维度配置（核心）
│   │   ├── douyinDimensions
│   │   ├── xiaohongshuDimensions
│   │   └── bilibiliDimensions
│   └── fieldMapping.ts          // 字段映射配置（核心）
│       ├── douyinFieldMap
│       ├── xiaohongshuFieldMap
│       └── bilibiliFieldMap
├── hooks/
│   ├── usePerformanceData.ts    // 数据加载（复用 useTalentData）
│   └── useDimensionConfig.ts    // 维度配置管理
└── utils/
    └── dataProcessor.ts         // 数据处理工具
```

**优点**:
- ✅ 核心逻辑只写一次（列表、导入、筛选）
- ✅ 新增平台只需添加配置文件
- ✅ 代码重复率低（< 20%）
- ✅ 易于维护和扩展
- ✅ 符合"代码效率最高"的要求

**缺点**:
- ⚠️ 需要设计良好的配置接口
- ⚠️ 初期投入略高

**ROI 评分**: ⭐⭐⭐⭐⭐ (**强烈推荐**)

---

#### 方案 C: 混合模式

**思路**: 核心功能通用 + 平台特殊处理

**结构**:
```typescript
pages/Performance/
├── PerformanceHome.tsx          // 主页面
├── components/                  // 80% 通用组件
└── platforms/                   // 20% 平台特殊逻辑
    ├── DouyinAdapter.tsx
    ├── XiaohongshuAdapter.tsx
    └── ...
```

**优点**:
- ✅ 平衡通用性和灵活性
- ✅ 复杂平台可自定义

**缺点**:
- ⚠️ 架构复杂度中等
- ⚠️ 需要明确通用/特殊的边界

**ROI 评分**: ⭐⭐⭐⭐ (备选)

---

## 🏗 技术架构（方案 B 配置驱动）

### 1. 平台维度配置接口

```typescript
// config/platformDimensions.ts

export interface DimensionConfig {
  id: string;              // 字段唯一标识
  name: string;            // 显示名称
  type: 'text' | 'number' | 'percentage' | 'date';
  category: string;        // 分类（基础信息/核心绩效/受众分析）
  required?: boolean;      // 是否必需
  visible?: boolean;       // 默认是否显示
  sortable?: boolean;      // 是否可排序
  width?: number;          // 列宽（可选）
  formatter?: (value: any) => string; // 自定义格式化函数
}

export interface PlatformDimensionConfig {
  platform: Platform;
  dimensions: DimensionConfig[];
  defaultVisibleIds: string[];  // 默认显示的维度
  storageKey: string;            // localStorage 键名
}

// 抖音维度配置
export const DOUYIN_DIMENSIONS: PlatformDimensionConfig = {
  platform: 'douyin',
  dimensions: [
    // 基础信息
    { id: 'name', name: '达人昵称', type: 'text', category: '基础信息', required: true, visible: true, sortable: true },
    { id: 'platformAccountId', name: '抖音UID', type: 'text', category: '基础信息', visible: false },
    { id: 'fansCount', name: '粉丝数', type: 'number', category: '基础信息', visible: true, sortable: true },
    { id: 'talentTier', name: '达人层级', type: 'text', category: '基础信息', visible: true, sortable: true },

    // 核心绩效
    { id: 'cpm', name: '60s+ 预期CPM', type: 'number', category: '核心绩效', visible: true, sortable: true },
    { id: 'avgPlayCount', name: '平均播放量', type: 'number', category: '核心绩效', visible: true, sortable: true },
    { id: 'avgLikeCount', name: '平均点赞数', type: 'number', category: '核心绩效', visible: false },

    // 受众分析 - 性别
    { id: 'audienceGender.male', name: '男性观众比例', type: 'percentage', category: '受众分析-性别', visible: true },
    { id: 'audienceGender.female', name: '女性观众比例', type: 'percentage', category: '受众分析-性别', visible: true },

    // 受众分析 - 年龄
    { id: 'audienceAge.18_23', name: '18-23岁', type: 'percentage', category: '受众分析-年龄', visible: false },
    { id: 'audienceAge.24_30', name: '24-30岁', type: 'percentage', category: '受众分析-年龄', visible: false },
    { id: 'audienceAge.31_40', name: '31-40岁', type: 'percentage', category: '受众分析-年龄', visible: false },
    { id: 'audienceAge.40_plus', name: '40岁以上', type: 'percentage', category: '受众分析-年龄', visible: false },

    // 人群包（抖音特有）
    { id: 'crowdPackage.town_middle_aged', name: '小镇中老年', type: 'percentage', category: '人群包分析', visible: false },
    { id: 'crowdPackage.senior_middle_class', name: '资深中产', type: 'percentage', category: '人群包分析', visible: false },
    // ... 更多人群包
  ],
  defaultVisibleIds: ['name', 'fansCount', 'talentTier', 'cpm', 'avgPlayCount', 'audienceGender.male', 'audienceGender.female'],
  storageKey: 'agentworks_performance_douyin_dimensions'
};

// 小红书维度配置（预留）
export const XIAOHONGSHU_DIMENSIONS: PlatformDimensionConfig = {
  platform: 'xiaohongshu',
  dimensions: [
    { id: 'name', name: '达人昵称', type: 'text', category: '基础信息', required: true, visible: true },
    { id: 'mcnName', name: 'MCN机构', type: 'text', category: '基础信息', visible: true },
    { id: 'avgLikes', name: '平均点赞数', type: 'number', category: '核心绩效', visible: true },
    { id: 'avgCollects', name: '平均收藏数', type: 'number', category: '核心绩效', visible: true },
    // ... 小红书特有维度
  ],
  defaultVisibleIds: ['name', 'mcnName', 'avgLikes', 'avgCollects'],
  storageKey: 'agentworks_performance_xiaohongshu_dimensions'
};

// 获取平台配置
export function getPlatformDimensionConfig(platform: Platform): PlatformDimensionConfig {
  const configs = {
    douyin: DOUYIN_DIMENSIONS,
    xiaohongshu: XIAOHONGSHU_DIMENSIONS,
    bilibili: BILIBILI_DIMENSIONS, // TODO
    kuaishou: KUAISHOU_DIMENSIONS  // TODO
  };
  return configs[platform];
}
```

**优势**:
- ✅ 新增平台只需添加配置对象
- ✅ 配置集中管理，易于维护
- ✅ 前端组件完全通用

---

### 2. 字段映射配置

**核心思想**: 可配置的映射规则，支持扩展

```typescript
// config/fieldMapping.ts

export interface FieldMappingRule {
  excelHeader: string;        // Excel/飞书列名
  targetPath: string;         // 目标字段路径（支持嵌套）
  format?: 'number' | 'percentage' | 'date' | 'text';
  transform?: (value: any) => any;  // 自定义转换函数
  validator?: (value: any) => boolean; // 验证函数
}

export interface PlatformFieldMapping {
  platform: Platform;
  mappings: FieldMappingRule[];
  requiredFields: string[];  // 必需字段（用于验证）
}

// 抖音字段映射
export const DOUYIN_FIELD_MAPPING: PlatformFieldMapping = {
  platform: 'douyin',
  mappings: [
    // 基础信息映射
    { excelHeader: '达人昵称', targetPath: 'name', format: 'text' },
    { excelHeader: '达人UID', targetPath: 'platformAccountId', format: 'text' },
    { excelHeader: '达人星图ID', targetPath: 'platformSpecific.xingtuId', format: 'text' },
    { excelHeader: '达人层级', targetPath: 'talentTier', format: 'text' },
    { excelHeader: '达人类型', targetPath: 'talentType', format: 'text',
      transform: (value) => value ? value.split(',').map(s => s.trim()) : [] },

    // 核心绩效映射
    { excelHeader: '60s+预期CPM', targetPath: 'performanceData.cpm', format: 'number' },
    { excelHeader: '平均播放量', targetPath: 'performanceData.avgPlayCount', format: 'number' },
    { excelHeader: '平均点赞数', targetPath: 'performanceData.avgLikeCount', format: 'number' },
    { excelHeader: '平均评论数', targetPath: 'performanceData.avgCommentCount', format: 'number' },

    // 受众分析映射
    { excelHeader: '男性观众比例', targetPath: 'performanceData.audienceGender.male', format: 'percentage' },
    { excelHeader: '女性观众比例', targetPath: 'performanceData.audienceGender.female', format: 'percentage' },
    { excelHeader: '18-23岁', targetPath: 'performanceData.audienceAge.18_23', format: 'percentage' },
    { excelHeader: '24-30岁', targetPath: 'performanceData.audienceAge.24_30', format: 'percentage' },
    { excelHeader: '31-40岁', targetPath: 'performanceData.audienceAge.31_40', format: 'percentage' },
    { excelHeader: '40岁以上', targetPath: 'performanceData.audienceAge.40_plus', format: 'percentage' },

    // 人群包映射
    { excelHeader: '小镇中老年', targetPath: 'performanceData.crowdPackage.town_middle_aged', format: 'percentage' },
    { excelHeader: '资深中产', targetPath: 'performanceData.crowdPackage.senior_middle_class', format: 'percentage' },
    { excelHeader: 'Z世代', targetPath: 'performanceData.crowdPackage.z_era', format: 'percentage' },
    // ... 更多映射
  ],
  requiredFields: ['name', 'platformAccountId']  // 必须有昵称和UID才能导入
};

// 小红书字段映射（预留）
export const XIAOHONGSHU_FIELD_MAPPING: PlatformFieldMapping = {
  platform: 'xiaohongshu',
  mappings: [
    { excelHeader: '达人昵称', targetPath: 'name', format: 'text' },
    { excelHeader: '小红书ID', targetPath: 'platformAccountId', format: 'text' },
    { excelHeader: 'MCN机构', targetPath: 'platformSpecific.mcnName', format: 'text' },
    { excelHeader: '平均点赞数', targetPath: 'performanceData.avgLikes', format: 'number' },
    // ... 小红书特有映射
  ],
  requiredFields: ['name', 'platformAccountId']
};

// 获取平台映射配置
export function getPlatformFieldMapping(platform: Platform): PlatformFieldMapping {
  const mappings = {
    douyin: DOUYIN_FIELD_MAPPING,
    xiaohongshu: XIAOHONGSHU_FIELD_MAPPING,
    bilibili: BILIBILI_FIELD_MAPPING,  // TODO
    kuaishou: KUAISHOU_FIELD_MAPPING   // TODO
  };
  return mappings[platform];
}
```

**优势**:
- ✅ 新增平台只需添加配置
- ✅ 支持嵌套字段路径（performanceData.audienceAge.18_23）
- ✅ 支持自定义转换函数
- ✅ 易于扩展和维护

---

### 3. 通用数据处理器

```typescript
// utils/dataProcessor.ts

/**
 * 根据映射规则处理导入数据
 */
export function processImportData(
  rows: any[],
  mapping: PlatformFieldMapping,
  platform: Platform
) {
  const validData = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const processedRow: any = {
      platform,
      performanceData: {},
      platformSpecific: {},
    };

    let hasRequiredFields = true;

    // 遍历映射规则
    mapping.mappings.forEach((rule) => {
      const value = row[rule.excelHeader];

      if (value === null || value === undefined || String(value).trim() === '') {
        // 检查是否为必需字段
        if (mapping.requiredFields.includes(rule.targetPath)) {
          hasRequiredFields = false;
        }
        return;
      }

      // 格式转换
      let processedValue = value;
      if (rule.format === 'percentage') {
        processedValue = parsePercentage(value);
      } else if (rule.format === 'number') {
        processedValue = parseFloat(value);
      } else if (rule.format === 'date') {
        processedValue = formatDate(value);
      }

      // 自定义转换
      if (rule.transform) {
        processedValue = rule.transform(processedValue);
      }

      // 验证
      if (rule.validator && !rule.validator(processedValue)) {
        return;
      }

      // 设置到目标路径（支持嵌套）
      setNestedValue(processedRow, rule.targetPath, processedValue);
    });

    if (hasRequiredFields) {
      validData.push(processedRow);
    } else {
      invalidRows.push({ row, index, reason: '缺少必需字段' });
    }
  });

  return { validData, invalidRows };
}

// 设置嵌套属性值
function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}
```

**优势**:
- ✅ 完全基于配置，无需硬编码
- ✅ 支持任意嵌套层级
- ✅ 支持自定义转换和验证
- ✅ 所有平台复用同一套逻辑

---

### 4. 通用表格组件

```typescript
// components/PerformanceTable.tsx

interface PerformanceTableProps {
  platform: Platform;
  talents: Talent[];
  dimensionConfig: PlatformDimensionConfig;
  visibleDimensionIds: string[];  // 用户选择显示的维度
  onSort: (dimensionId: string) => void;
}

export function PerformanceTable({
  platform,
  talents,
  dimensionConfig,
  visibleDimensionIds,
  onSort
}: PerformanceTableProps) {
  // 获取显示的维度
  const visibleDimensions = dimensionConfig.dimensions.filter(
    dim => visibleDimensionIds.includes(dim.id)
  );

  return (
    <table>
      <thead>
        <tr>
          {visibleDimensions.map(dim => (
            <th
              key={dim.id}
              onClick={() => dim.sortable && onSort(dim.id)}
              className={dim.sortable ? 'cursor-pointer' : ''}
            >
              {dim.name}
              {dim.sortable && <SortIcon />}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {talents.map(talent => (
          <tr key={talent.oneId}>
            {visibleDimensions.map(dim => (
              <td key={dim.id}>
                {formatCellValue(talent, dim)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 根据维度配置格式化单元格值
function formatCellValue(talent: Talent, dimension: DimensionConfig) {
  const value = getNestedValue(talent, dimension.id);

  if (value === null || value === undefined) {
    return 'N/A';
  }

  // 使用自定义格式化函数
  if (dimension.formatter) {
    return dimension.formatter(value);
  }

  // 默认格式化
  switch (dimension.type) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'number':
      return value.toLocaleString();
    case 'date':
      return formatDate(value);
    default:
      return String(value);
  }
}
```

**优势**:
- ✅ 组件完全通用，不依赖特定平台
- ✅ 基于配置渲染，灵活性高
- ✅ 代码复用率 100%

---

## 📥 数据导入方案

### 方案对比

#### 方案 A: 前端映射（旧系统方式）

**流程**:
```
飞书/Excel → 前端解析 → 前端应用映射 → 批量更新 API
```

**优点**:
- ✅ 前端可预览数据
- ✅ 用户可确认后再导入

**缺点**:
- ❌ 前端代码复杂（需要处理 XLSX）
- ❌ 映射逻辑分散（前端+后端都有）
- ❌ 维护困难

---

#### 方案 B: 后端映射 + 前端配置（推荐）

**流程**:
```
1. 前端上传文件 URL（飞书）或文件（Excel）
2. 后端云函数读取数据
3. 后端应用映射配置（存储在数据库或配置表）
4. 后端返回预处理数据
5. 前端展示预览
6. 用户确认后，前端调用批量更新
```

**架构**:
```typescript
// 新建云函数: processPerformanceImport

exports.handler = async (event) => {
  const { platform, dataSource, sourceUrl, fileData, mappingConfigId } = JSON.parse(event.body);

  // 1. 读取数据源
  let rawData;
  if (dataSource === 'feishu') {
    rawData = await fetchFeishuData(sourceUrl);
  } else if (dataSource === 'excel') {
    rawData = parseExcelData(fileData);
  }

  // 2. 获取映射配置
  const mapping = await getFieldMapping(platform, mappingConfigId);

  // 3. 应用映射
  const { validData, invalidRows } = processWithMapping(rawData, mapping);

  // 4. 返回预处理数据
  return {
    success: true,
    data: {
      validData,
      invalidRows,
      summary: {
        total: rawData.length,
        valid: validData.length,
        invalid: invalidRows.length
      }
    }
  };
};
```

**前端调用**:
```typescript
// 1. 上传数据，获取预处理结果
const preview = await processPerformanceImport({
  platform: 'douyin',
  dataSource: 'feishu',
  sourceUrl: feishuUrl,
  mappingConfigId: 'default'  // 或用户自定义配置ID
});

// 2. 展示预览
showPreviewModal(preview.data);

// 3. 用户确认后，批量更新
if (userConfirmed) {
  await bulkUpdateTalents(preview.data.validData);
}
```

**优势**:
- ✅ 映射逻辑集中在后端
- ✅ 前端代码简洁
- ✅ 易于调试和维护
- ✅ 支持映射配置版本化

---

#### 方案 C: 独立的字段映射模块

**思路**: 提取为独立的微服务或模块

**架构**:
```
fieldMappingService (独立模块)
├── 映射配置存储（数据库/配置表）
├── 映射规则引擎
├── 数据转换器
└── 验证器

前端 → fieldMappingService → 返回映射后的数据 → 批量更新
```

**优势**:
- ✅ 高度解耦
- ✅ 可独立测试和优化
- ✅ 支持多个产品复用

**缺点**:
- ⚠️ 架构复杂度高
- ⚠️ 适合长期规划

**ROI 评分**: ⭐⭐⭐ (长期考虑)

---

## 🎯 推荐方案总结

### 页面架构：方案 B（配置驱动）

**为什么**:
- ✅ 代码效率最高（核心逻辑只写一次）
- ✅ 易于扩展（新增平台只需配置）
- ✅ 符合你的要求

### 数据导入：方案 B（后端映射 + 前端配置）

**为什么**:
- ✅ 映射逻辑集中管理
- ✅ 前端代码简洁
- ✅ 易于维护和调试
- ✅ 可以后续升级到方案 C

---

## 🔧 代码效率优化策略

### 1. 最大化代码复用

**组件复用率目标**: 90%+

| 组件 | 是否通用 | 复用率 |
|------|:--------:|:------:|
| PerformanceTable | ✅ | 100% |
| DataImportModal | ✅ | 100% |
| DimensionManager | ✅ | 100% |
| StatsDashboard | ✅ | 95% |
| FilterPanel | ✅ | 90% |

**平台特定代码**: < 10%（仅配置文件）

---

### 2. 配置驱动开发

**新增平台工作量**:
```
传统方式（方案A）:
├── 编写新页面组件（~500行）
├── 编写导入逻辑（~200行）
├── 编写表格渲染（~150行）
└── 编写筛选逻辑（~100行）
总计：~950行，2-3天

配置驱动（方案B）:
├── 添加维度配置（~50行）
└── 添加字段映射（~40行）
总计：~90行，0.5天

效率提升：83% ⬆️
```

---

### 3. 利用 Phase 1 基础设施

**可复用的 Hooks 和工具**:
- ✅ `useTalentData` - 数据加载（通用）
- ✅ `useApiCall` - API 调用（通用）
- ✅ `PriceConverter` - 价格转换（通用）
- 🆕 `useDimensionConfig` - 维度配置管理（新建）
- 🆕 `useDataImport` - 数据导入管理（新建）

---

### 4. 模块化设计

**借鉴 ByteProject 的优点**:
- ✅ 模块化（11个模块）
- ✅ 单一职责
- ✅ 清晰的依赖关系

**升级到 React + TypeScript**:
- ✅ 组件化（而非模块化）
- ✅ 类型安全
- ✅ 更好的开发体验

---

## 📐 实施路线

### 阶段 1: 核心基础（1-2天）

**目标**: 搭建通用框架

- [ ] 1.1 创建 PerformanceHome.tsx（主页面）
- [ ] 1.2 创建平台 Tab 切换
- [ ] 1.3 创建 PerformanceTable 通用组件
- [ ] 1.4 创建抖音维度配置
- [ ] 1.5 实现基础列表展示

---

### 阶段 2: 数据导入（1-2天）

**目标**: 实现飞书导入（抖音）

- [ ] 2.1 创建抖音字段映射配置
- [ ] 2.2 创建数据导入组件
- [ ] 2.3 实现数据预览功能
- [ ] 2.4 实现批量更新逻辑
- [ ] 2.5 或创建新的云函数 processPerformanceImport

---

### 阶段 3: 完善功能（1天）

**目标**: 完善用户体验

- [ ] 3.1 添加维度管理功能
- [ ] 3.2 添加统计卡片
- [ ] 3.3 优化UI/UX
- [ ] 3.4 测试验证

---

### 阶段 4: 多平台扩展（按需）

**目标**: 为其他平台预留

- [ ] 4.1 添加小红书维度配置
- [ ] 4.2 添加小红书字段映射
- [ ] 4.3 测试小红书数据导入
- [ ] 4.4 其他平台...

---

## ❓ 待讨论的关键问题

### 🔴 问题 1: 字段映射配置存储位置

**选项 A**: 硬编码在前端配置文件
- ✅ 简单直接
- ❌ 修改需要部署

**选项 B**: 存储在数据库
- ✅ 可在线修改
- ✅ 支持多版本配置
- ❌ 需要管理界面

**选项 C**: 混合模式（推荐）
- ✅ 默认配置硬编码
- ✅ 支持用户自定义配置存储数据库
- ✅ 平衡灵活性和简单性

**你的倾向**？

---

### 🔴 问题 2: 数据导入处理位置

**选项 A**: 前端处理（旧系统）
- ✅ 可离线预览
- ❌ 前端代码复杂

**选项 B**: 后端云函数处理
- ✅ 映射逻辑集中
- ✅ 易于维护
- ❌ 需要新建云函数

**选项 C**: 复用现有 syncFromFeishu
- ✅ 不需要新建云函数
- ❌ 需要升级支持 v2 数据库
- ❌ 需要支持多平台映射

**你的倾向**？

---

### 🔴 问题 3: 数据维度的粒度

**抖音维度数量**:
- **最小**: 10 个（基础信息 + 核心绩效）
- **中等**: 15 个（+ 核心受众）
- **完整**: 20+ 个（+ 年龄段 + 人群包）

**问题**:
- 要不要一次性实现所有维度？
- 还是先实现核心维度，后续按需添加？

**建议**:
- 先实现 15 个核心维度
- 架构支持扩展，后续添加很容易

**你的想法**？

---

### 🔴 问题 4: 字段映射的灵活性

**场景**: 飞书表格列名可能变化

**选项 A**: 严格匹配
- 列名必须完全一致
- 不一致就导入失败

**选项 B**: 智能匹配
- 支持模糊匹配（如"达人昵称" = "昵称" = "达人名称"）
- 支持用户手动调整映射

**选项 C**: 配置管理
- 允许用户保存自定义映射配置
- 下次导入时复用

**建议**: 先实现 A（严格匹配），后续升级到 C

**你的想法**？

---

### 🔴 问题 5: 是否需要独立的字段映射管理页面

**功能**: 可视化管理字段映射规则

**优势**:
- ✅ 不需要改代码就能调整映射
- ✅ 适合飞书表格格式变化频繁的场景

**劣势**:
- ❌ 增加开发工作量（1-2天）
- ❌ 对于固定格式可能是过度设计

**建议**:
- 第一版不做，使用硬编码配置
- 如果后续发现映射经常变化，再开发

**你的想法**？

---

## 🎯 我的综合建议

基于"代码效率最高"的要求，我推荐：

### 第一版（MVP）

1. **页面架构**: 配置驱动（方案 B）
   - 核心组件通用，配置差异化

2. **数据导入**: 后端云函数处理
   - 升级 syncFromFeishu 支持 v2 + 多平台

3. **字段映射**: 硬编码配置文件
   - 前端定义映射规则
   - 后端应用映射

4. **数据维度**: 先做 15 个核心维度（抖音）
   - 后续按需扩展

5. **其他平台**: 预留接口，暂不实现
   - 架构支持，配置即可启用

### 预期投入

**总工作量**: 3-4 天
- 阶段 1: 核心列表（1-1.5天）
- 阶段 2: 数据导入（1.5-2天）
- 阶段 3: 完善优化（0.5-1天）

### 预期产出

- ✅ 抖音达人表现页面（完整功能）
- ✅ 通用组件和配置框架
- ✅ 新增平台只需添加配置（< 0.5天）
- ✅ 代码复用率 90%+

---

## 💬 下一步讨论

请告诉我你对以下问题的想法：

1. **页面架构**: 配置驱动（方案 B）是否认可？
2. **数据导入**: 后端处理还是前端处理？
3. **字段映射**: 硬编码配置还是数据库存储？
4. **数据维度**: 先做多少个维度？完整还是核心？
5. **字段映射管理**: 是否需要可视化管理界面？

确认方案后，我会创建详细的实施文档（类似 TALENT_PAGINATION_OPTIMIZATION_PLAN.md），然后开始编码！

---

**文档状态**: 📝 讨论稿
**下一步**: 等待方案确认

🤖 Generated with [Claude Code](https://claude.com/claude-code)
