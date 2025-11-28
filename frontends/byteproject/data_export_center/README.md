# 数据导出中心模块化文档

## 概述

数据导出中心已从单体JavaScript文件重构为模块化的ES6架构。此架构提供了更好的代码组织、可维护性和可测试性。

## 模块架构

### 模块依赖关系图

```
constants.js
    ↓
utils.js
    ↓
api.js
    ↓
state-manager.js
    ↓
dimension-config.js
    ↓
filter-renderer.js ←→ dimension-renderer.js
    ↓                        ↓
export-handler.js ←──────────┘
    ↓
main.js (入口点)
```

## 模块详细说明

### 1. constants.js（常量模块）
**用途**：定义所有常量和配置值

**主要导出**：
- `API_BASE_URL` - API基础URL
- `API_ENDPOINTS` - API端点配置对象
- `EXPORT_ENTITIES` - 导出实体类型枚举
- `FILTER_TYPES` - 筛选器类型枚举

**依赖**：无

### 2. utils.js（工具函数模块）
**用途**：提供通用的工具函数

**主要导出**：
- `showToast(message, isSuccess)` - 显示提示消息
- `getDefaultTimeMonth()` - 获取默认时间月份
- `setLoadingState()` - 设置加载状态
- `checkXLSXLibrary()` - 检查XLSX库可用性
- `generateExcelFilename(baseFilename)` - 生成Excel文件名

**依赖**：无

### 3. api.js（API请求模块）
**用途**：封装所有API请求逻辑

**主要导出**：
- `apiRequest(endpoint, options)` - 通用API请求方法
- `getRequest(endpoint, headers)` - GET请求便捷方法
- `postRequest(endpoint, body, headers)` - POST请求便捷方法

**依赖**：
- `utils.js` - 使用showToast函数

### 4. state-manager.js（状态管理模块）
**用途**：集中管理应用程序状态

**主要导出**：
- `updateSelectedEntity(entity)` - 更新选中的导出主体
- `updateFilters(filters)` - 更新筛选条件
- `updateDimensions(dimensions)` - 更新选中维度
- `toggleDimension(dimensionId, selected)` - 切换维度选择
- `getState()` - 获取完整状态
- `getSelectedEntity()` - 获取当前选中实体
- `updateInitialConfigs(configs)` - 更新初始配置

**依赖**：
- `constants.js` - 使用EXPORT_ENTITIES

### 5. dimension-config.js（维度配置模块）
**用途**：定义所有导出主体的筛选条件和可导出维度

**主要导出**：
- `DIMENSION_CONFIG` - 完整的维度配置对象
- `getEntityConfig(entity)` - 获取指定实体配置
- `getEntityFilters(entity)` - 获取实体筛选器
- `getEntityDimensions(entity)` - 获取实体维度
- `isValidDimension(entity, dimensionId)` - 验证维度有效性

**依赖**：无

### 6. filter-renderer.js（筛选器渲染模块）
**用途**：负责动态生成和管理筛选条件UI

**主要导出**：
- `renderFilters(entity, container)` - 渲染筛选器
- `renderFilterInput(filter)` - 渲染单个筛选控件
- `populateFilterOptions(filterId, options)` - 动态更新选项
- `getFilterValues(entity)` - 获取当前筛选值

**依赖**：
- `constants.js` - 使用FILTER_TYPES
- `dimension-config.js` - 获取实体配置
- `state-manager.js` - 获取初始配置和状态

### 7. dimension-renderer.js（维度渲染模块）
**用途**：负责动态生成和管理可导出维度UI

**主要导出**：
- `renderDimensions(entity, container)` - 渲染维度选择器
- `renderDimensionGroups(groups, container)` - 渲染维度组
- `handleDimensionSelection(event)` - 处理维度选择事件
- `getSelectedDimensions()` - 获取选中的维度
- `selectAllDimensions()` - 全选维度
- `deselectAllDimensions()` - 取消全选

**依赖**：
- `dimension-config.js` - 获取维度配置
- `state-manager.js` - 管理维度选择状态

### 8. export-handler.js（导出处理模块）
**用途**：处理数据导出和Excel文件生成

**主要导出**：
- `handleExport(uiElements)` - 处理导出操作
- `buildExportPayload(timeMonth)` - 构建导出请求数据
- `generateExcelFile(data, fields, filename)` - 生成Excel文件
- `validateExportData(payload)` - 验证导出数据

**依赖**：
- `constants.js` - 使用API_ENDPOINTS
- `api.js` - 发送API请求
- `state-manager.js` - 获取当前状态
- `filter-renderer.js` - 获取筛选值
- `dimension-renderer.js` - 获取选中维度
- `utils.js` - 使用工具函数

### 9. main.js（主入口模块）
**用途**：应用程序初始化和协调各模块

**主要功能**：
- 初始化应用程序
- 缓存DOM元素
- 加载初始配置
- 设置事件监听器
- 协调模块间交互

**依赖**：所有其他模块

### 10. README.md（文档）
当前文档，提供模块架构说明和使用指南。

## 使用示例

### 在HTML中引入模块

```html
<!-- 在HTML文件中添加 -->
<script type="module" src="data_export_center/main.js"></script>
```

### 添加新的筛选器类型

```javascript
// 在 dimension-config.js 中添加新的筛选器
export const DIMENSION_CONFIG = {
    talent: {
        filters: [
            // ... 现有筛选器
            {
                id: 'newFilter',
                label: '新筛选器',
                type: 'select',
                options: ['选项1', '选项2']
            }
        ],
        // ...
    }
};
```

### 添加新的维度

```javascript
// 在 dimension-config.js 中添加新维度
export const DIMENSION_CONFIG = {
    talent: {
        // ...
        dimensions: {
            '新维度组': [
                { id: 'new_field_1', label: '新字段1' },
                { id: 'new_field_2', label: '新字段2' }
            ]
        }
    }
};
```

### 自定义导出格式

```javascript
// 在 export-handler.js 中自定义处理函数
function processDataForExport(data, selectedFields) {
    // 自定义数据处理逻辑
    return data.map(row => {
        // 自定义转换
        return processedRow;
    });
}
```

## 开发指南

### 添加新功能

1. 确定功能归属的模块
2. 在相应模块中添加新函数
3. 使用JSDoc注释记录函数
4. 导出新函数
5. 在需要的模块中导入使用

### 调试

```javascript
// 在浏览器控制台中访问调试接口
DataExportCenter.getAppState(); // 获取当前应用状态
DataExportCenter.reinitialize(); // 重新初始化应用
```

### 测试建议

1. **单元测试**：每个模块可独立测试
2. **集成测试**：测试模块间交互
3. **E2E测试**：测试完整导出流程

## 性能优化

- 使用模块懒加载减少初始加载时间
- 缓存DOM元素引用避免重复查询
- 并行加载API请求提高响应速度
- 使用状态管理减少不必要的渲染

## 维护说明

### 版本更新

当前版本：2.3.0

更新日志：
- v2.3.0 - 按项目导出新增合作返点（collaboration_rebate）字段
- v2.2.0 - 按项目导出新增达人维度（星图ID、60s+价格、达人最高返点率）
- v2.1.0 - 添加 taskId 和 videoId 字段支持
- v2.0.0 - 完成模块化重构
- v1.3.0 - 原始单体版本

### 常见问题

**Q: 如何添加新的导出主体？**
A: 在dimension-config.js中添加新的配置，然后在constants.js中添加对应的实体类型。

**Q: 如何自定义Excel样式？**
A: 在export-handler.js的generateExcelFile函数中修改工作表样式设置。

**Q: 如何处理大数据量导出？**
A: 可以考虑实现分页导出或流式处理，在export-handler.js中添加相应逻辑。

## 联系与支持

如有问题或建议，请联系开发团队。

---

最后更新：2025-11-28