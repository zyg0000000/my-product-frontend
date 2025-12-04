# 计算字段功能实现计划

## 需求背景

用户希望在导入数据时自动计算派生字段，例如：
- `60s预期CPM = 抖音60+s短视频报价 / 预期播放量 × 1000`

## 当前系统架构

```
飞书Excel → syncFromFeishu → mapping-engine.js → MongoDB
                                ↓
                        applyMappingRules()
                                ↓
                        1. 读取 field_mappings 配置
                        2. 逐行解析 Excel 数据
                        3. 按 targetCollection 分流
                        4. 写入 talents / talent_performance
```

## 实现方案

### 数据结构扩展

在 `field_mappings` 配置中新增 `computedFields` 数组：

```typescript
interface ComputedFieldRule {
  id: string;                    // 字段ID，如 'cpm_60s_expected'
  name: string;                  // 显示名称，如 '60s预期CPM'
  targetPath: string;            // 目标路径，如 'metrics.cpm_60s_expected'
  targetCollection: 'talents' | 'talent_performance';
  formula: {
    type: 'division' | 'multiplication' | 'addition' | 'subtraction' | 'custom';
    // 除法: (operand1 / operand2) * multiplier
    // 乘法: operand1 * operand2 * multiplier
    operand1: string;            // 第一个操作数的 targetPath
    operand2: string;            // 第二个操作数的 targetPath
    multiplier?: number;         // 乘数（如 CPM 计算需要 × 1000）
    precision?: number;          // 保留小数位数
  };
  category?: string;             // 分类
  order?: number;                // 排序
}

interface FieldMappingConfig {
  // ... 现有字段
  mappings: FieldMappingRule[];
  computedFields?: ComputedFieldRule[];  // 新增
}
```

### 示例配置

```json
{
  "computedFields": [
    {
      "id": "cpm_60s_expected",
      "name": "60s预期CPM",
      "targetPath": "metrics.cpm_60s_expected",
      "targetCollection": "talent_performance",
      "formula": {
        "type": "division",
        "operand1": "prices.video_60plus",
        "operand2": "metrics.expected_plays",
        "multiplier": 1000,
        "precision": 2
      },
      "category": "核心绩效"
    },
    {
      "id": "cpm_21_60_expected",
      "name": "21-60s预期CPM",
      "targetPath": "metrics.cpm_21_60_expected",
      "targetCollection": "talent_performance",
      "formula": {
        "type": "division",
        "operand1": "prices.video_21_60",
        "operand2": "metrics.expected_plays",
        "multiplier": 1000,
        "precision": 2
      },
      "category": "核心绩效"
    }
  ]
}
```

### 后端修改

#### 1. mapping-engine.js 扩展

在 `applyMappingRules` 函数末尾增加计算字段处理：

```javascript
// 在每行数据处理完成后，计算派生字段
if (mappingConfig.computedFields && mappingConfig.computedFields.length > 0) {
  for (const computed of mappingConfig.computedFields) {
    const value = calculateComputedField(talentRow, perfRow, computed);
    if (value !== null && value !== undefined && !isNaN(value)) {
      if (computed.targetCollection === 'talent_performance') {
        setNestedValue(perfRow, computed.targetPath, value);
      } else {
        setNestedValue(talentRow, computed.targetPath, value);
      }
    }
  }
}
```

新增计算函数：

```javascript
/**
 * 计算派生字段
 * @param {Object} talentRow - talents 数据
 * @param {Object} perfRow - talent_performance 数据
 * @param {Object} computed - 计算字段配置
 */
function calculateComputedField(talentRow, perfRow, computed) {
  const { formula } = computed;

  // 获取操作数值（支持跨集合引用）
  const val1 = getValueFromPath(talentRow, perfRow, formula.operand1);
  const val2 = getValueFromPath(talentRow, perfRow, formula.operand2);

  // 检查操作数有效性
  if (val1 === null || val1 === undefined || isNaN(val1)) return null;
  if (val2 === null || val2 === undefined || isNaN(val2) || val2 === 0) return null;

  let result;
  switch (formula.type) {
    case 'division':
      result = (val1 / val2) * (formula.multiplier || 1);
      break;
    case 'multiplication':
      result = val1 * val2 * (formula.multiplier || 1);
      break;
    case 'addition':
      result = (val1 + val2) * (formula.multiplier || 1);
      break;
    case 'subtraction':
      result = (val1 - val2) * (formula.multiplier || 1);
      break;
    default:
      return null;
  }

  // 精度处理
  if (formula.precision !== undefined) {
    result = Number(result.toFixed(formula.precision));
  }

  return result;
}

/**
 * 从路径获取值（支持跨集合）
 */
function getValueFromPath(talentRow, perfRow, path) {
  // prices.video_60plus 特殊处理
  if (path.startsWith('prices.')) {
    const priceType = path.replace('prices.', '');
    const priceRecord = talentRow.prices?.find(p => p.type === priceType);
    return priceRecord ? priceRecord.price / 100 : null; // 分转元
  }

  // metrics.xxx 从 perfRow 获取
  if (path.startsWith('metrics.')) {
    return getNestedValue(perfRow, path);
  }

  // 其他从 talentRow 获取
  return getNestedValue(talentRow, path);
}
```

### 前端修改

#### 1. 类型定义扩展 (api/performance.ts)

```typescript
export interface ComputedFieldFormula {
  type: 'division' | 'multiplication' | 'addition' | 'subtraction';
  operand1: string;
  operand2: string;
  multiplier?: number;
  precision?: number;
}

export interface ComputedFieldRule {
  id: string;
  name: string;
  targetPath: string;
  targetCollection: 'talents' | 'talent_performance';
  formula: ComputedFieldFormula;
  category?: string;
  order?: number;
}

export interface FieldMappingConfig {
  // ... 现有字段
  computedFields?: ComputedFieldRule[];
}
```

#### 2. 配置管理组件 (ComputedFieldManager.tsx)

新增计算字段配置管理组件，支持：
- 添加/编辑/删除计算字段
- 配置公式（选择操作数、运算类型、乘数）
- 预览计算结果

#### 3. 维度配置同步

计算字段需要同步到 `dimension_configs`，用于前端展示：
- 在保存计算字段配置时，自动创建对应的维度配置
- 设置 `isComputed: true` 标记

### 实现步骤

1. **后端**：扩展 mapping-engine.js
   - 新增 `calculateComputedField` 函数
   - 修改 `applyMappingRules` 调用计算逻辑
   - 测试现有导入流程不受影响

2. **数据库**：更新配置结构
   - 在 field_mappings 中添加 computedFields 数组
   - 添加初始计算字段配置

3. **前端配置**：
   - 扩展 FieldMappingConfig 类型
   - 新增 ComputedFieldManager 组件
   - 集成到 PerformanceConfig 页面

4. **前端展示**：
   - 同步计算字段到 dimension_configs
   - 支持在列设置中显示/隐藏计算字段
   - 支持排序和筛选

### 预计工作量

| 任务 | 预计复杂度 |
|------|-----------|
| 后端 mapping-engine.js 扩展 | 中 |
| 数据库配置更新 | 低 |
| 前端类型定义 | 低 |
| ComputedFieldManager 组件 | 高 |
| 配置页面集成 | 中 |
| 维度配置同步 | 中 |
| 测试与验证 | 中 |

### 注意事项

1. **计算顺序**：计算字段依赖其他字段，需要在所有映射字段处理完成后再计算
2. **空值处理**：操作数为空或零时，计算结果应为 null，不写入数据库
3. **价格单位**：数据库中价格以分存储，计算时需转换为元
4. **向后兼容**：`computedFields` 为可选字段，不影响现有导入逻辑
