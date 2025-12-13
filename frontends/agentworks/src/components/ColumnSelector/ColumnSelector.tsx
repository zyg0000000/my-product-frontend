/**
 * 列选择器组件 (ColumnSelector)
 *
 * 用于达人全景页面动态选择显示列
 * 设计规范：遵循 AgentWorks UI/UX Guidelines v3.4
 *
 * 功能特性：
 * - 侧边抽屉展示（Drawer）
 * - 分类折叠面板（Collapse）
 * - 字段搜索过滤
 * - 分类全选/取消
 * - 恢复默认
 * - 已选数量统计
 *
 * @version 1.0.0
 * @date 2025-12-04
 */

import { useState, useMemo } from 'react';
import {
  Drawer,
  Collapse,
  Checkbox,
  Input,
  InputNumber,
  Button,
  Badge,
  Tooltip,
  Empty,
  Switch,
} from 'antd';
import {
  SettingOutlined,
  SearchOutlined,
  UndoOutlined,
  UserOutlined,
  DollarOutlined,
  PercentageOutlined,
  BarChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SortAscendingOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type {
  FieldDefinition,
  FieldCategory,
  CategoryInfo,
} from '@/config/panoramaFields';

// ========== 类型定义 ==========

export interface ColumnSelectorProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 可用字段列表 */
  availableFields: FieldDefinition[];
  /** 按分类分组的字段 */
  fieldsByCategory: Record<FieldCategory, FieldDefinition[]>;
  /** 当前选中的字段ID列表 */
  selectedFields: string[];
  /** 切换单个字段 */
  onToggleField: (fieldId: string) => void;
  /** 切换分类全选 */
  onToggleCategory: (category: FieldCategory) => void;
  /** 恢复默认 */
  onResetToDefault: () => void;
  /** 各分类选中统计 */
  categoryStats: Record<FieldCategory, { selected: number; total: number }>;
  /** 分类信息列表 */
  categories: CategoryInfo[];
  /** 是否有自定义选择 */
  hasCustomSelection: boolean;
  /** 上移字段（在分类内） */
  onMoveFieldUp?: (fieldId: string, category: FieldCategory) => void;
  /** 下移字段（在分类内） */
  onMoveFieldDown?: (fieldId: string, category: FieldCategory) => void;
  /** 更新字段排序开关 */
  onToggleSortable?: (fieldId: string) => void;
  /** 更新字段宽度 */
  onUpdateWidth?: (fieldId: string, width: number) => void;
}

// ========== 分类图标映射 ==========

const CATEGORY_ICONS: Record<FieldCategory, React.ReactNode> = {
  basic: <UserOutlined />,
  price: <DollarOutlined />,
  rebate: <PercentageOutlined />,
  metrics: <BarChartOutlined />,
  audience: <PieChartOutlined />,
  customer: <TeamOutlined />,
};

// ========== 组件实现 ==========

export function ColumnSelector({
  open,
  onClose,
  availableFields,
  fieldsByCategory,
  selectedFields,
  onToggleField,
  onToggleCategory,
  onResetToDefault,
  categoryStats,
  categories,
  hasCustomSelection,
  onMoveFieldUp,
  onMoveFieldDown,
  onToggleSortable,
  onUpdateWidth,
}: ColumnSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedConfig, setExpandedConfig] = useState<Record<string, boolean>>({});

  // 搜索过滤后的字段
  const filteredFieldsByCategory = useMemo(() => {
    if (!searchTerm.trim()) {
      return fieldsByCategory;
    }

    const term = searchTerm.toLowerCase().trim();
    const result: Record<FieldCategory, FieldDefinition[]> = {
      basic: [],
      price: [],
      rebate: [],
      metrics: [],
      audience: [],
      customer: [],
    };

    for (const [category, fields] of Object.entries(fieldsByCategory)) {
      result[category as FieldCategory] = fields.filter(
        field =>
          field.name.toLowerCase().includes(term) ||
          field.id.toLowerCase().includes(term) ||
          (field.description && field.description.toLowerCase().includes(term))
      );
    }

    return result;
  }, [fieldsByCategory, searchTerm]);

  // 计算过滤后各分类是否有字段
  const categoriesWithFields = useMemo(() => {
    return categories.filter(
      cat => filteredFieldsByCategory[cat.id].length > 0
    );
  }, [categories, filteredFieldsByCategory]);

  // 已选字段集合（用于快速查找）
  const selectedSet = useMemo(() => new Set(selectedFields), [selectedFields]);

  // 渲染分类头部
  const renderCategoryHeader = (category: CategoryInfo) => {
    const stats = categoryStats[category.id];
    const isAllSelected = stats.selected === stats.total && stats.total > 0;
    const isPartialSelected =
      stats.selected > 0 && stats.selected < stats.total;

    return (
      <div className="flex items-center justify-between w-full pr-2">
        <div className="flex items-center gap-2">
          <span className="text-primary-600">
            {CATEGORY_ICONS[category.id]}
          </span>
          <span className="font-medium">{category.name}</span>
          <Badge
            count={`${stats.selected}/${stats.total}`}
            style={{
              backgroundColor:
                stats.selected > 0
                  ? 'var(--aw-primary-600, #4f46e5)'
                  : 'var(--aw-gray-300, #d1d5db)',
              fontSize: 11,
            }}
          />
        </div>
        <Checkbox
          checked={isAllSelected}
          indeterminate={isPartialSelected}
          onChange={(e: CheckboxChangeEvent) => {
            e.stopPropagation();
            onToggleCategory(category.id);
          }}
          onClick={e => e.stopPropagation()}
        >
          <span className="text-xs text-content-secondary">全选</span>
        </Checkbox>
      </div>
    );
  };

  // 渲染字段项
  const renderFieldItem = (field: FieldDefinition, category: FieldCategory, fieldsInCategory: FieldDefinition[]) => {
    const isSelected = selectedSet.has(field.id);
    const isConfigExpanded = expandedConfig[field.id];
    const fieldIndex = fieldsInCategory.findIndex(f => f.id === field.id);
    const isFirst = fieldIndex === 0;
    const isLast = fieldIndex === fieldsInCategory.length - 1;

    return (
      <div
        key={field.id}
        className={`
          rounded-md border transition-all duration-150
          ${
            isSelected
              ? 'bg-primary-50 border-primary-200'
              : 'bg-surface border-transparent hover:bg-surface-subtle hover:border-stroke'
          }
        `}
      >
        {/* 主行：复选框 + 字段名 + 标签 */}
        <div className="flex items-center justify-between py-2 px-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onChange={() => onToggleField(field.id)}
              onClick={e => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm truncate ${
                    isSelected ? 'text-primary-700 font-medium' : 'text-content-secondary'
                  }`}
                >
                  {field.name}
                </span>
                {field.sortable && (
                  <Tooltip title="支持排序">
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <SortAscendingOutlined className="text-xs" />
                      可排序
                    </span>
                  </Tooltip>
                )}
                {field.customerViewOnly && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                    客户视角
                  </span>
                )}
              </div>
              {field.description && (
                <div className="text-xs text-content-secondary truncate mt-0.5">
                  {field.description}
                </div>
              )}
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {/* 上下移动箭头 */}
            {onMoveFieldUp && onMoveFieldDown && (
              <div className="flex flex-col">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={isFirst}
                  onClick={e => {
                    e.stopPropagation();
                    onMoveFieldUp(field.id, category);
                  }}
                  className="h-4 w-6 flex items-center justify-center p-0"
                  style={{ fontSize: 10 }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={isLast}
                  onClick={e => {
                    e.stopPropagation();
                    onMoveFieldDown(field.id, category);
                  }}
                  className="h-4 w-6 flex items-center justify-center p-0"
                  style={{ fontSize: 10 }}
                />
              </div>
            )}

            {/* 展开/收起配置按钮 */}
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={e => {
                e.stopPropagation();
                setExpandedConfig(prev => ({
                  ...prev,
                  [field.id]: !prev[field.id],
                }));
              }}
              className={`${isConfigExpanded ? 'text-primary-600' : 'text-gray-400'}`}
            />
          </div>
        </div>

        {/* 展开的配置区域 */}
        {isConfigExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/50 space-y-2">
            {/* 列宽调整 */}
            {onUpdateWidth && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-secondary flex items-center gap-1">
                  <ColumnWidthOutlined />
                  列宽
                </span>
                <InputNumber
                  size="small"
                  min={60}
                  max={500}
                  step={10}
                  value={field.width || 100}
                  onChange={value => {
                    if (value) {
                      onUpdateWidth(field.id, value);
                    }
                  }}
                  className="w-28"
                  suffix="px"
                />
              </div>
            )}

            {/* 排序开关 */}
            {onToggleSortable && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-secondary flex items-center gap-1">
                  <SortAscendingOutlined />
                  支持排序
                </span>
                <Switch
                  size="small"
                  checked={field.sortable || false}
                  onChange={() => onToggleSortable(field.id)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 构建折叠面板项
  const collapseItems = categoriesWithFields.map(category => {
    const fieldsInCategory = filteredFieldsByCategory[category.id];
    return {
      key: category.id,
      label: renderCategoryHeader(category),
      children: (
        <div className="space-y-2">
          {fieldsInCategory.map(field => renderFieldItem(field, category.id, fieldsInCategory))}
        </div>
      ),
    };
  });

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingOutlined className="text-primary-600" />
            <span className="font-semibold text-base">列设置</span>
          </div>
          {hasCustomSelection && (
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={onResetToDefault}
              className="text-content-secondary hover:text-primary-600"
            >
              恢复默认
            </Button>
          )}
        </div>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid var(--aw-gray-100, #f0f0f0)' },
      }}
    >
      {/* 搜索框 */}
      <div className="p-4 border-b border-gray-100 sticky top-0 bg-surface z-10">
        <Input
          placeholder="搜索字段名称..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          allowClear
          className="rounded-lg"
        />
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-content-secondary">
            已选择{' '}
            <span className="text-primary-600 font-semibold">
              {selectedFields.length}
            </span>{' '}
            个字段
          </span>
          <span className="text-content-secondary text-xs">
            共 {availableFields.length} 个可用
          </span>
        </div>
      </div>

      {/* 分类折叠面板 */}
      <div className="px-4 py-2">
        {categoriesWithFields.length > 0 ? (
          <Collapse
            items={collapseItems}
            defaultActiveKey={['basic', 'price', 'rebate']}
            expandIconPosition="start"
            ghost
            className="column-selector-collapse"
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-content-secondary">未找到匹配的字段</span>
            }
            className="py-12"
          />
        )}
      </div>

      {/* 底部固定区域 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-content-secondary">
            选择的字段将在表格中显示
          </span>
          <Button type="primary" onClick={onClose}>
            确定
          </Button>
        </div>
      </div>

      {/* 自定义样式 */}
      <style>{`
        .column-selector-collapse .ant-collapse-header {
          padding: 12px 0 !important;
          border-radius: 8px;
        }
        .column-selector-collapse .ant-collapse-header:hover {
          background-color: var(--aw-gray-50, #f9fafb);
        }
        .column-selector-collapse .ant-collapse-content-box {
          padding: 8px 0 16px 0 !important;
        }
        .column-selector-collapse .ant-collapse-item {
          border-bottom: 1px solid var(--aw-gray-100, #f3f4f6) !important;
        }
        .column-selector-collapse .ant-collapse-item:last-child {
          border-bottom: none !important;
        }
        .column-selector-collapse .ant-collapse-expand-icon {
          color: var(--aw-gray-400, #9ca3af);
        }
      `}</style>
    </Drawer>
  );
}

export default ColumnSelector;
