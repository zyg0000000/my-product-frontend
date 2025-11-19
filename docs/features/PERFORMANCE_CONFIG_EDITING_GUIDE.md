# 达人表现配置编辑 - 开发者指南

> **适用于**: Phase 7 完成后的版本
> **创建日期**: 2025-11-19

---

## 📚 快速导航

- [组件架构](#组件架构)
- [API使用](#api使用)
- [添加新功能](#添加新功能)
- [常见问题](#常见问题)

---

## 🏗 组件架构

### 整体结构

```
PerformanceConfig (页面)
├── MappingConfigPanel
│   └── FieldMappingManager
│       ├── Modal (编辑表单)
│       └── ConfirmDialog (删除确认)
│
└── DimensionConfigPanel
    └── DimensionManager
        ├── DndContext (拖拽上下文)
        │   └── SortableDimensionRow (可拖拽行)
        ├── Modal (编辑表单)
        └── ConfirmDialog (删除确认)
```

### 数据流

```
用户操作
  ↓
组件事件处理
  ↓
Hook方法调用 (useFieldMapping / useDimensionConfig)
  ↓
API请求 (fieldMappingManager / dimensionConfigManager)
  ↓
云函数处理
  ↓
数据库更新 (field_mappings / dimension_configs)
  ↓
重新加载配置
  ↓
UI更新 + Toast提示
```

---

## 🔌 API 使用

### 字段映射 Hook

```typescript
import { useFieldMapping } from '../../hooks/useFieldMapping';

function MyComponent() {
  const fieldMapping = useFieldMapping('douyin');

  // 读取数据
  const { activeConfig, loading } = fieldMapping;

  // 添加映射规则
  await fieldMapping.addMappingRule({
    excelHeader: 'CPM',
    targetPath: 'performanceData.cpm',
    format: 'number',
    required: true
  });

  // 更新映射规则
  await fieldMapping.updateMappingRule(0, {
    ...mappings[0],
    format: 'percentage'
  });

  // 删除映射规则
  await fieldMapping.deleteMappingRule(0);

  // 刷新配置
  await fieldMapping.loadConfigs();
}
```

### 维度配置 Hook

```typescript
import { useDimensionConfig } from '../../hooks/useDimensionConfig';

function MyComponent() {
  const dimensionConfig = useDimensionConfig('douyin');

  // 读取数据
  const { activeConfig, loading } = dimensionConfig;

  // 添加维度
  await dimensionConfig.addDimension({
    id: 'new_metric',
    name: '新指标',
    type: 'number',
    category: '核心指标',
    targetPath: 'performanceData.newMetric',
    defaultVisible: true,
    sortable: true,
    width: 120,
    order: dimensions.length
  });

  // 更新维度
  await dimensionConfig.updateDimension(0, {
    ...dimensions[0],
    width: 150
  });

  // 删除维度
  await dimensionConfig.deleteDimension(0);

  // 重新排序
  await dimensionConfig.reorderDimensions(newOrderedDimensions);

  // 切换可见性
  await dimensionConfig.toggleDimensionVisibility('cpm');
}
```

---

## ➕ 添加新功能

### 示例1: 添加批量删除功能

**1. 更新 Hook**

```typescript
// src/hooks/useFieldMapping.ts

// 添加批量删除方法
const bulkDeleteMappingRules = async (indices: number[]) => {
  if (!activeConfig) {
    error('没有激活的配置');
    return;
  }

  const updatedMappings = activeConfig.mappings.filter(
    (_, index) => !indices.includes(index)
  );

  const updatedConfig = {
    ...activeConfig,
    mappings: updatedMappings
  };

  await updateConfig(updatedConfig);
};

return {
  // ...existing methods
  bulkDeleteMappingRules
};
```

**2. 更新组件**

```typescript
// src/components/Performance/FieldMappingManager.tsx

function FieldMappingManager({ mappings, onBulkDelete, ... }) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const handleBulkDelete = async () => {
    await onBulkDelete(selectedIndices);
    setSelectedIndices([]);
  };

  return (
    <>
      {selectedIndices.length > 0 && (
        <button onClick={handleBulkDelete}>
          删除选中 ({selectedIndices.length})
        </button>
      )}

      {/* 表格中添加复选框 */}
      <input
        type="checkbox"
        checked={selectedIndices.includes(index)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedIndices([...selectedIndices, index]);
          } else {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
          }
        }}
      />
    </>
  );
}
```

### 示例2: 添加配置导出功能

```typescript
// src/hooks/useFieldMapping.ts

const exportConfig = () => {
  if (!activeConfig) return;

  const dataStr = JSON.stringify(activeConfig, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `field_mapping_${platform}_${Date.now()}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

return {
  // ...existing methods
  exportConfig
};
```

---

## ❓ 常见问题

### Q1: 如何自定义删除确认对话框的样式？

```typescript
<ConfirmDialog
  isOpen={deletingIndex !== null}
  title="确认删除"
  message="自定义消息"
  confirmLabel="确定删除"
  cancelLabel="我再想想"
  confirmButtonClass="bg-purple-600 hover:bg-purple-700 text-white"
  onConfirm={handleDelete}
  onCancel={() => setDeletingIndex(null)}
/>
```

### Q2: 如何添加新的数据格式类型？

**1. 更新类型定义**

```typescript
// src/api/performance.ts

export interface FieldMappingRule {
  // ...
  format: 'text' | 'number' | 'percentage' | 'date' | 'currency'; // 添加 currency
}
```

**2. 更新表单选项**

```typescript
// src/components/Performance/FieldMappingManager.tsx

<select value={editingRule.format} ...>
  <option value="text">文本</option>
  <option value="number">数字</option>
  <option value="percentage">百分比</option>
  <option value="date">日期</option>
  <option value="currency">货币</option> {/* 新增 */}
</select>
```

**3. 更新样式**

```typescript
// 列表展示的标签颜色

<span className={`px-2 py-1 rounded text-xs ${
  rule.format === 'percentage' ? 'bg-purple-100 text-purple-700' :
  rule.format === 'number' ? 'bg-green-100 text-green-700' :
  rule.format === 'date' ? 'bg-blue-100 text-blue-700' :
  rule.format === 'currency' ? 'bg-yellow-100 text-yellow-700' : // 新增
  'bg-gray-100 text-gray-700'
}`}>
  {rule.format}
</span>
```

### Q3: 如何禁用某些维度的拖拽？

```typescript
// src/components/Performance/DimensionManager.tsx

function SortableDimensionRow({ dimension, ... }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dimension.id,
    disabled: dimension.required // 必需字段不允许拖拽
  });

  // ...
}
```

### Q4: 如何添加字段验证？

```typescript
// src/components/Performance/FieldMappingManager.tsx

const handleSave = async () => {
  if (!editingRule) return;

  // 验证Excel列名
  if (!editingRule.excelHeader.trim()) {
    alert('Excel列名不能为空');
    return;
  }

  // 验证目标路径格式
  if (!/^[a-zA-Z0-9._]+$/.test(editingRule.targetPath)) {
    alert('目标路径只能包含字母、数字、点和下划线');
    return;
  }

  // 检查重复
  const isDuplicate = mappings.some(
    (m, i) => m.excelHeader === editingRule.excelHeader && i !== editingIndex
  );

  if (isDuplicate) {
    alert('Excel列名已存在');
    return;
  }

  // 保存
  // ...
};
```

### Q5: 如何自定义拖拽的视觉效果？

```typescript
// src/components/Performance/DimensionManager.tsx

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1, // 自定义透明度
  backgroundColor: isDragging ? '#f0f9ff' : 'transparent', // 自定义背景色
  cursor: isDragging ? 'grabbing' : 'default', // 自定义光标
};
```

### Q6: 如何添加撤销功能？

```typescript
// 使用状态历史记录

const [history, setHistory] = useState<FieldMappingConfig[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const updateConfigWithHistory = async (newConfig: FieldMappingConfig) => {
  // 保存到历史
  setHistory([...history.slice(0, historyIndex + 1), activeConfig!]);
  setHistoryIndex(historyIndex + 1);

  // 更新配置
  await updateConfig(newConfig);
};

const undo = async () => {
  if (historyIndex > 0) {
    const previousConfig = history[historyIndex - 1];
    await updateConfig(previousConfig);
    setHistoryIndex(historyIndex - 1);
  }
};

const redo = async () => {
  if (historyIndex < history.length - 1) {
    const nextConfig = history[historyIndex + 1];
    await updateConfig(nextConfig);
    setHistoryIndex(historyIndex + 1);
  }
};
```

---

## 🎨 样式自定义

### Tailwind类名速查

**按钮**:
```typescript
// 主要按钮
"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"

// 次要按钮
"px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"

// 危险按钮
"px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
```

**标签**:
```typescript
// 成功
"px-2 py-1 bg-green-100 text-green-700 rounded text-xs"

// 警告
"px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"

// 信息
"px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
```

**表格**:
```typescript
// 表头
"px-4 py-3 text-left font-medium text-gray-700 bg-gray-50"

// 表格行
"px-4 py-3 hover:bg-gray-50 border-t"
```

---

## 🔍 调试技巧

### 1. 查看配置数据

```typescript
// 在组件中添加
useEffect(() => {
  console.log('Active Config:', fieldMapping.activeConfig);
}, [fieldMapping.activeConfig]);
```

### 2. 监控API调用

```typescript
// src/api/performance.ts

export async function updateFieldMapping(config: FieldMappingConfig) {
  console.log('Updating config:', config);
  const result = await put('/fieldMappingManager', config);
  console.log('Update result:', result);
  return result;
}
```

### 3. 测试拖拽事件

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  console.log('Drag event:', event);
  console.log('Active ID:', event.active.id);
  console.log('Over ID:', event.over?.id);
  // ...
};
```

---

## 📖 相关文档

- [TALENT_PERFORMANCE_DESIGN.md](./TALENT_PERFORMANCE_DESIGN.md) - 整体设计方案
- [PERFORMANCE_PHASE7_SUMMARY.md](./PERFORMANCE_PHASE7_SUMMARY.md) - Phase 7 完成总结
- [mapping-engine.js](../../functions/syncFromFeishu/mapping-engine.js) - 映射引擎实现

---

**更新日期**: 2025-11-19

🤖 Generated with [Claude Code](https://claude.com/claude-code)
