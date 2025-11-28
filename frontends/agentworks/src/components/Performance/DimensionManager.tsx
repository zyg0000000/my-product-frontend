/**
 * 维度配置管理组件（分类折叠版本）
 * v2.0: 使用 Ant Design Collapse 按分类折叠展示
 */

import { useState, useMemo } from 'react';
import {
  Collapse,
  Button,
  Tag,
  Checkbox,
  Space,
  Tooltip,
  message,
  AutoComplete,
  Form,
  Input,
  Select,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
  UserOutlined,
  LineChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { logger } from '../../utils/logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DimensionConfig } from '../../api/performance';
import type { Platform } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { useBatchEdit } from '../../hooks/useBatchEdit';
import { BatchEditToolbar } from '../BatchEditToolbar';

interface CategoryConfig {
  name: string;
  order: number;
  icon?: string;
}

interface DimensionManagerProps {
  dimensions: DimensionConfig[];
  platform: Platform;
  categories?: CategoryConfig[];
  onAdd: (dimension: DimensionConfig) => Promise<void>;
  onUpdate: (index: number, dimension: DimensionConfig) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  onReorder: (dimensions: DimensionConfig[]) => Promise<void>;
  onBatchUpdate: (dimensions: DimensionConfig[]) => Promise<void>;
}

// 默认分类配置
const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: '基础信息', order: 1, icon: 'user' },
  { name: '核心绩效', order: 2, icon: 'chart' },
  { name: '受众分析-性别', order: 3, icon: 'users' },
  { name: '受众分析-年龄', order: 4, icon: 'calendar' },
  { name: '人群包分析', order: 5, icon: 'group' },
];

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  chart: <LineChartOutlined />,
  users: <TeamOutlined />,
  calendar: <CalendarOutlined />,
  group: <AppstoreOutlined />,
};

// 获取分类图标
function getCategoryIcon(iconName?: string): React.ReactNode {
  if (!iconName) return <AppstoreOutlined />;
  return CATEGORY_ICONS[iconName] || <AppstoreOutlined />;
}

// 类型标签颜色
const TYPE_COLORS: Record<string, string> = {
  text: 'default',
  number: 'green',
  percentage: 'purple',
  date: 'blue',
  price: 'orange',
};

export function DimensionManager({
  dimensions,
  platform,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onBatchUpdate,
}: DimensionManagerProps) {
  // 使用传入的分类配置，如果没有则使用默认值
  const categoryOptions =
    categories && categories.length > 0
      ? [...categories].sort((a, b) => a.order - b.order)
      : DEFAULT_CATEGORIES;

  // 使用平台配置 Hook 获取价格类型
  const { getPlatformPriceTypes } = usePlatformConfig(true);
  const priceTypes = getPlatformPriceTypes(platform);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDimension, setEditingDimension] =
    useState<DimensionConfig | null>(null);

  // 使用批量编辑 Hook
  const {
    localData: localDimensions,
    hasChanges,
    saving,
    updateItems,
    saveChanges,
    cancelChanges,
  } = useBatchEdit({
    initialData: dimensions,
    onSave: async updatedDimensions => {
      // 一次性批量更新所有变更，避免逐个请求导致状态不同步
      await onBatchUpdate(updatedDimensions);
    },
  });

  // 切换单个维度可见性（仅本地状态）
  const handleToggleVisibilityLocal = (dimensionId: string) => {
    updateItems(
      d => d.id === dimensionId,
      d => ({ ...d, defaultVisible: !d.defaultVisible })
    );
  };

  // 按分类分组维度
  const dimensionsByCategory = useMemo(() => {
    const grouped: Record<string, DimensionConfig[]> = {};

    // 初始化所有分类
    categoryOptions.forEach(cat => {
      grouped[cat.name] = [];
    });
    grouped['其他'] = [];

    // 分组
    localDimensions.forEach(dim => {
      const category = dim.category || '其他';
      if (grouped[category]) {
        grouped[category].push(dim);
      } else {
        grouped['其他'].push(dim);
      }
    });

    return grouped;
  }, [localDimensions, categoryOptions]);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dimensions.findIndex(d => d.id === active.id);
      const newIndex = dimensions.findIndex(d => d.id === over.id);

      const reorderedDimensions = arrayMove(dimensions, oldIndex, newIndex);
      await onReorder(reorderedDimensions);
    }
  };

  const handleAdd = () => {
    setEditingDimension({
      id: `dim_${Date.now()}`,
      name: '',
      type: 'text',
      category: '基础信息',
      targetPath: '',
      required: false,
      defaultVisible: true,
      sortable: true,
      width: 120,
      order: dimensions.length,
    });
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingDimension({ ...dimensions[index] });
  };

  const handleSave = async () => {
    if (!editingDimension) return;

    if (!editingDimension.name || !editingDimension.targetPath) {
      message.warning('维度名称和目标字段路径不能为空');
      return;
    }

    try {
      if (isAdding) {
        await onAdd(editingDimension);
      } else if (editingIndex !== null) {
        await onUpdate(editingIndex, editingDimension);
      }
      handleCloseModal();
    } catch (error) {
      logger.error('保存失败:', error);
    }
  };

  const handleDelete = async () => {
    if (deletingIndex === null) return;

    try {
      await onDelete(deletingIndex);
      setDeletingIndex(null);
    } catch (error) {
      logger.error('删除失败:', error);
    }
  };

  const handleCloseModal = () => {
    setEditingIndex(null);
    setEditingDimension(null);
    setIsAdding(false);
  };

  // 生成 Collapse items
  const collapseItems = categoryOptions.map(cat => {
    const dims = dimensionsByCategory[cat.name] || [];
    const visibleCount = dims.filter(d => d.defaultVisible).length;

    return {
      key: cat.name,
      label: (
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            {getCategoryIcon(cat.icon)}
            <span className="font-medium">{cat.name}</span>
            <Tag color="blue">{dims.length} 个维度</Tag>
          </div>
          <div className="text-sm text-gray-500">
            默认显示 {visibleCount} 个
          </div>
        </div>
      ),
      children:
        dims.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={dims.map(d => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {dims.map(dimension => {
                  const originalIndex = dimensions.findIndex(
                    d => d.id === dimension.id
                  );
                  return (
                    <SortableDimensionCard
                      key={dimension.id}
                      dimension={dimension}
                      index={originalIndex}
                      onEdit={handleEdit}
                      onDelete={setDeletingIndex}
                      onToggleVisibility={handleToggleVisibilityLocal}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-8 text-gray-400">
            此分类暂无维度配置
          </div>
        ),
    };
  });

  // 添加"其他"分类（如果有未分类的维度）
  if (dimensionsByCategory['其他']?.length > 0) {
    const dims = dimensionsByCategory['其他'];
    const visibleCount = dims.filter(d => d.defaultVisible).length;

    collapseItems.push({
      key: '其他',
      label: (
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <AppstoreOutlined />
            <span className="font-medium">其他</span>
            <Tag color="default">{dims.length} 个维度</Tag>
          </div>
          <div className="text-sm text-gray-500">
            默认显示 {visibleCount} 个
          </div>
        </div>
      ),
      children: (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={dims.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {dims.map(dimension => {
                const originalIndex = dimensions.findIndex(
                  d => d.id === dimension.id
                );
                return (
                  <SortableDimensionCard
                    key={dimension.id}
                    dimension={dimension}
                    index={originalIndex}
                    onEdit={handleEdit}
                    onDelete={setDeletingIndex}
                    onToggleVisibility={handleToggleVisibilityLocal}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          总计 {localDimensions.length} 个维度
          <span className="ml-3 text-primary-600">
            默认显示 {localDimensions.filter(d => d.defaultVisible).length} 个
          </span>
        </div>
        <Space>
          <BatchEditToolbar
            hasChanges={hasChanges}
            saving={saving}
            onSave={saveChanges}
            onCancel={cancelChanges}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加维度
          </Button>
        </Space>
      </div>

      {/* 提示 */}
      <div className="bg-primary-50 border border-primary-200 rounded-md p-3 text-sm text-primary-800">
        <strong>提示：</strong>
        拖动左侧的排序图标可以调整维度的显示顺序，点击分类展开/折叠
      </div>

      {/* 分类折叠面板 */}
      <Collapse
        items={collapseItems}
        defaultActiveKey={[]}
        className="bg-white"
      />

      {/* 编辑/新增模态框 */}
      <Modal
        isOpen={isAdding || editingIndex !== null}
        title={isAdding ? '添加维度' : '编辑维度'}
        onClose={handleCloseModal}
        size="lg"
      >
        {editingDimension && (
          <DimensionEditForm
            dimension={editingDimension}
            isAdding={isAdding}
            categoryOptions={categoryOptions}
            priceTypes={priceTypes}
            onChange={setEditingDimension}
            onSave={handleSave}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deletingIndex !== null}
        title="确认删除"
        message={`确定要删除维度"${deletingIndex !== null ? dimensions[deletingIndex]?.name : ''}"吗？此操作不可恢复。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeletingIndex(null)}
      />
    </div>
  );
}

/**
 * 可拖拽的维度卡片组件
 */
function SortableDimensionCard({
  dimension,
  index,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  dimension: DimensionConfig;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleVisibility: (dimensionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dimension.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
    >
      {/* 拖动手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-move text-gray-400 hover:text-gray-600"
      >
        <HolderOutlined className="text-lg" />
      </div>

      {/* 默认显示复选框 */}
      <Checkbox
        checked={dimension.defaultVisible || false}
        onChange={() => onToggleVisibility(dimension.id)}
      />

      {/* 维度信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{dimension.name}</span>
          <Tag
            color={TYPE_COLORS[dimension.type] || 'default'}
            className="text-xs"
          >
            {dimension.type}
          </Tag>
          {dimension.pinned && (
            <Tag color="orange" className="text-xs">
              固定
            </Tag>
          )}
          {dimension.filterable && (
            <Tag color="cyan" className="text-xs">
              可筛选
            </Tag>
          )}
        </div>
        <div className="text-xs text-gray-500 font-mono truncate mt-1">
          {dimension.targetPath}
          {dimension.targetCollection === 'talent_performance' && (
            <span className="ml-2 text-purple-500">[performance]</span>
          )}
        </div>
      </div>

      {/* 宽度 */}
      <div className="text-xs text-gray-400 w-16 text-right">
        {dimension.width}px
      </div>

      {/* 操作按钮 */}
      <Space size="small">
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(index)}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(index)}
          />
        </Tooltip>
      </Space>
    </div>
  );
}

/**
 * 维度编辑表单（多 Tab 版本 + Ant Design 组件）
 */
type EditTab = 'basic' | 'display' | 'filter';

interface PriceTypeConfig {
  key: string;
  label: string;
}

function DimensionEditForm({
  dimension,
  isAdding,
  categoryOptions,
  priceTypes,
  onChange,
  onSave,
  onCancel,
}: {
  dimension: DimensionConfig;
  isAdding: boolean;
  categoryOptions: CategoryConfig[];
  priceTypes: PriceTypeConfig[];
  onChange: (dimension: DimensionConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EditTab>('basic');

  const tabs: { key: EditTab; label: string; icon: string }[] = [
    {
      key: 'basic',
      label: '基础信息',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      key: 'display',
      label: '显示设置',
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    },
    {
      key: 'filter',
      label: '筛选配置',
      icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    },
  ];

  const filterOptionsStr = dimension.filterOptions?.join(', ') || '';
  const handleFilterOptionsChange = (value: string) => {
    const options = value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    onChange({
      ...dimension,
      filterOptions: options.length > 0 ? options : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Tab 导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.icon}
                />
              </svg>
              {tab.label}
              {tab.key === 'filter' && dimension.filterable && (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      <div className="min-h-[300px]">
        {/* 基础信息 Tab */}
        {activeTab === 'basic' && (
          <Form layout="vertical" className="space-y-4">
            <Form.Item
              label="维度ID"
              tooltip={!isAdding ? 'ID创建后不可修改' : undefined}
            >
              <Input
                value={dimension.id}
                onChange={e => onChange({ ...dimension, id: e.target.value })}
                disabled={!isAdding}
                placeholder="例如: cpm"
              />
            </Form.Item>

            <Form.Item label="维度名称" required>
              <Input
                value={dimension.name}
                onChange={e => onChange({ ...dimension, name: e.target.value })}
                placeholder="例如: CPM"
              />
            </Form.Item>

            <Form.Item
              label="分类"
              tooltip="可从下拉列表选择，或直接输入新的分类名称"
            >
              <AutoComplete
                value={dimension.category}
                onChange={value => onChange({ ...dimension, category: value })}
                options={categoryOptions.map(cat => ({
                  value: cat.name,
                  label: cat.name,
                }))}
                placeholder="选择或输入新分类"
                allowClear
              />
            </Form.Item>

            <Form.Item label="目标字段路径" required>
              <Input
                value={dimension.targetPath}
                onChange={e =>
                  onChange({ ...dimension, targetPath: e.target.value })
                }
                placeholder="例如: metrics.cpm"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            <Form.Item label="数据类型">
              <Select
                value={dimension.type}
                onChange={value => onChange({ ...dimension, type: value })}
                options={[
                  { value: 'text', label: '文本 (text)' },
                  { value: 'number', label: '数字 (number)' },
                  { value: 'percentage', label: '百分比 (percentage)' },
                  { value: 'date', label: '日期 (date)' },
                  { value: 'price', label: '价格 (price)' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="数据来源"
              tooltip="指定从哪个集合读取此维度的数据"
            >
              <Select
                value={dimension.targetCollection || 'talents'}
                onChange={value =>
                  onChange({
                    ...dimension,
                    targetCollection: value as 'talents' | 'talent_performance',
                  })
                }
                options={[
                  { value: 'talents', label: '达人主表 (talents)' },
                  {
                    value: 'talent_performance',
                    label: '表现数据 (talent_performance)',
                  },
                ]}
              />
            </Form.Item>

            {dimension.type === 'price' && priceTypes.length > 0 && (
              <Form.Item label="价格类型" required>
                <Select
                  value={dimension.priceType || undefined}
                  onChange={value =>
                    onChange({ ...dimension, priceType: value })
                  }
                  placeholder="请选择价格类型"
                  options={priceTypes.map(pt => ({
                    value: pt.key,
                    label: `${pt.label} (${pt.key})`,
                  }))}
                />
              </Form.Item>
            )}
          </Form>
        )}

        {/* 显示设置 Tab */}
        {activeTab === 'display' && (
          <Form layout="vertical" className="space-y-4">
            <Form.Item label="列宽（像素）">
              <InputNumber
                value={dimension.width}
                onChange={value =>
                  onChange({ ...dimension, width: value || 120 })
                }
                min={80}
                max={400}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item>
              <Space direction="vertical" className="w-full">
                <Checkbox
                  checked={dimension.defaultVisible || false}
                  onChange={e =>
                    onChange({ ...dimension, defaultVisible: e.target.checked })
                  }
                >
                  默认显示（在列表页面默认显示此维度）
                </Checkbox>

                <Checkbox
                  checked={dimension.sortable !== false}
                  onChange={e =>
                    onChange({ ...dimension, sortable: e.target.checked })
                  }
                >
                  可排序（允许用户点击列头排序）
                </Checkbox>

                <Checkbox
                  checked={dimension.pinned || false}
                  onChange={e =>
                    onChange({ ...dimension, pinned: e.target.checked })
                  }
                >
                  固定在左侧（不受横向滚动影响，始终可见）
                </Checkbox>
              </Space>
            </Form.Item>
          </Form>
        )}

        {/* 筛选配置 Tab */}
        {activeTab === 'filter' && (
          <Form layout="vertical" className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-md p-3 text-sm text-primary-800">
              <strong>提示：</strong>启用筛选后，此维度将出现在 Performance
              页面的筛选面板中
            </div>

            <Form.Item>
              <Checkbox
                checked={dimension.filterable || false}
                onChange={e =>
                  onChange({
                    ...dimension,
                    filterable: e.target.checked,
                    filterType: e.target.checked
                      ? dimension.filterType || 'text'
                      : undefined,
                    filterOrder: e.target.checked
                      ? dimension.filterOrder || 1
                      : undefined,
                  })
                }
              >
                <span className="font-medium">
                  启用筛选（允许用户通过此维度筛选数据）
                </span>
              </Checkbox>
            </Form.Item>

            {dimension.filterable && (
              <div className="space-y-4 pl-6 border-l-2 border-primary-200">
                <Form.Item
                  label="筛选器类型"
                  tooltip={
                    dimension.filterType === 'text'
                      ? '适用于名称、ID等文本字段'
                      : dimension.filterType === 'range'
                        ? '适用于数字、百分比等数值字段'
                        : '适用于层级、状态等固定选项字段'
                  }
                >
                  <Select
                    value={dimension.filterType || 'text'}
                    onChange={value =>
                      onChange({
                        ...dimension,
                        filterType: value as 'text' | 'range' | 'enum',
                        filterOptions:
                          value === 'enum'
                            ? dimension.filterOptions
                            : undefined,
                      })
                    }
                    options={[
                      { value: 'text', label: '文本搜索（输入框模糊匹配）' },
                      { value: 'range', label: '数值区间（最小值-最大值）' },
                      { value: 'enum', label: '枚举多选（固定选项勾选）' },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  label="筛选面板排序"
                  tooltip="数字越小，在筛选面板中显示越靠前"
                >
                  <InputNumber
                    value={dimension.filterOrder || 1}
                    onChange={value =>
                      onChange({ ...dimension, filterOrder: value || 1 })
                    }
                    min={1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                {dimension.filterType === 'enum' && (
                  <Form.Item
                    label="枚举选项"
                    required
                    tooltip="多个选项用逗号分隔，如：头部, 腰部, 尾部"
                  >
                    <Input
                      value={filterOptionsStr}
                      onChange={e => handleFilterOptionsChange(e.target.value)}
                      placeholder="头部, 腰部, 尾部"
                    />
                    {dimension.filterOptions &&
                      dimension.filterOptions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {dimension.filterOptions.map((opt, idx) => (
                            <Tag key={idx}>{opt}</Tag>
                          ))}
                        </div>
                      )}
                  </Form.Item>
                )}
              </div>
            )}
          </Form>
        )}
      </div>

      {/* 按钮 */}
      <Form.Item className="mb-0 pt-4 border-t">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={onSave}>
            保存
          </Button>
        </Space>
      </Form.Item>
    </div>
  );
}
