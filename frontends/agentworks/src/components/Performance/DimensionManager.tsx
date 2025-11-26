/**
 * 维度配置管理组件（完整CRUD版本 + 拖拽排序）
 * Phase 7: 支持添加、编辑、删除、拖拽排序、切换可见性
 * Phase 9: 批量可见性修改（减少刷新次数）- 可复用设计
 */

import { useState } from 'react';
import { message } from 'antd';
import { logger } from '../../utils/logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
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
  platform: Platform;  // 新增：当前平台
  categories?: CategoryConfig[];  // 新增：分类配置（从数据库读取）
  onAdd: (dimension: DimensionConfig) => Promise<void>;
  onUpdate: (index: number, dimension: DimensionConfig) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  onReorder: (dimensions: DimensionConfig[]) => Promise<void>;
  onToggleVisibility: (dimensionId: string) => Promise<void>;
}

// 默认分类配置（当数据库没有配置时使用）
const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: '基础信息', order: 1 },
  { name: '核心绩效', order: 2 },
  { name: '受众分析', order: 3 },
  { name: '人群包', order: 4 }
];

export function DimensionManager({
  dimensions,
  platform,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onToggleVisibility
}: DimensionManagerProps) {
  // 使用传入的分类配置，如果没有则使用默认值
  const categoryOptions = (categories && categories.length > 0)
    ? [...categories].sort((a, b) => a.order - b.order)
    : DEFAULT_CATEGORIES;

  // 使用平台配置 Hook 获取价格类型（动态配置）
  const { getPlatformPriceTypes } = usePlatformConfig(true);
  const priceTypes = getPlatformPriceTypes(platform);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDimension, setEditingDimension] = useState<DimensionConfig | null>(null);

  // 使用批量编辑 Hook
  const {
    localData: localDimensions,
    hasChanges,
    saving,
    updateItems,
    saveChanges,
    cancelChanges
  } = useBatchEdit({
    initialData: dimensions,
    onSave: async (updatedDimensions) => {
      // 找出所有可见性变化的维度并批量更新
      for (let i = 0; i < updatedDimensions.length; i++) {
        if (updatedDimensions[i].defaultVisible !== dimensions[i].defaultVisible) {
          await onToggleVisibility(updatedDimensions[i].id);
        }
      }
    }
  });

  // 切换单个维度可见性（仅本地状态）
  const handleToggleVisibilityLocal = (dimensionId: string) => {
    updateItems(
      (d) => d.id === dimensionId,
      (d) => ({ ...d, defaultVisible: !d.defaultVisible })
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = dimensions.findIndex((d) => d.id === active.id);
      const newIndex = dimensions.findIndex((d) => d.id === over.id);

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
      order: dimensions.length
    });
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingDimension({ ...dimensions[index] });
  };

  const handleSave = async () => {
    if (!editingDimension) return;

    // 验证
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

  return (
    <div className="space-y-4">
      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          总计 {localDimensions.length} 个维度
          <span className="ml-3 text-blue-600">
            默认显示 {localDimensions.filter(d => d.defaultVisible).length} 个
          </span>
        </div>
        <div className="flex gap-2">
          {/* 批量编辑工具栏（可复用组件）*/}
          <BatchEditToolbar
            hasChanges={hasChanges}
            saving={saving}
            onSave={saveChanges}
            onCancel={cancelChanges}
          />

          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加维度
          </button>
        </div>
      </div>

      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <strong>提示：</strong>拖动左侧的排序图标可以调整维度的显示顺序
      </div>

      {/* 维度列表（可拖拽） */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localDimensions.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 w-12 whitespace-nowrap"></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">维度名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">分类</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">目标路径</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">类型</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">默认显示</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">固定列</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">可排序</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">宽度</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {localDimensions.map((dimension, index) => (
                  <SortableDimensionRow
                    key={dimension.id}
                    dimension={dimension}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={setDeletingIndex}
                    onToggleVisibility={handleToggleVisibilityLocal}
                  />
                ))}
              </tbody>
            </table>

            {dimensions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                暂无维度配置，点击"添加维度"开始配置
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

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
 * 可拖拽的维度行组件
 */
function SortableDimensionRow({
  dimension,
  index,
  onEdit,
  onDelete,
  onToggleVisibility
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
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      {/* 拖动手柄 */}
      <td className="px-4 py-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </td>

      <td className="px-4 py-3 font-medium text-gray-900">{dimension.name}</td>
      <td className="px-4 py-3 text-gray-600">{dimension.category}</td>
      <td className="px-4 py-3 font-mono text-xs text-gray-600">{dimension.targetPath}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          dimension.type === 'percentage' ? 'bg-purple-100 text-purple-700' :
          dimension.type === 'number' ? 'bg-green-100 text-green-700' :
          dimension.type === 'date' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {dimension.type}
        </span>
      </td>

      {/* 默认显示勾选框 */}
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={dimension.defaultVisible || false}
          onChange={() => onToggleVisibility(dimension.id)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        />
      </td>

      {/* 固定列勾选框（仅显示，需通过编辑修改） */}
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={dimension.pinned || false}
          readOnly
          className="w-4 h-4 text-orange-600 border-gray-300 rounded cursor-default"
          title="需要通过编辑维度来修改固定列设置"
        />
      </td>

      <td className="px-4 py-3 text-center">
        {dimension.sortable ? (
          <span className="text-blue-600">✓</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-center text-gray-600">{dimension.width}px</td>

      {/* 操作按钮 */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onEdit(index)}
            className="text-blue-600 hover:text-blue-800"
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(index)}
            className="text-red-600 hover:text-red-800"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * 维度编辑表单（多 Tab 版本）
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
  onCancel
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

  // Tab 配置
  const tabs: { key: EditTab; label: string; icon: string }[] = [
    { key: 'basic', label: '基础信息', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'display', label: '显示设置', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { key: 'filter', label: '筛选配置', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' }
  ];

  // 处理 filterOptions 输入（逗号分隔转数组）
  const filterOptionsStr = dimension.filterOptions?.join(', ') || '';
  const handleFilterOptionsChange = (value: string) => {
    const options = value.split(',').map(s => s.trim()).filter(Boolean);
    onChange({ ...dimension, filterOptions: options.length > 0 ? options : undefined });
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
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
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
          <div className="space-y-4">
            {/* 维度ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                维度ID
              </label>
              <input
                type="text"
                value={dimension.id}
                onChange={(e) => onChange({ ...dimension, id: e.target.value })}
                disabled={!isAdding}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="例如: cpm"
              />
              {!isAdding && (
                <p className="mt-1 text-xs text-gray-500">ID创建后不可修改</p>
              )}
            </div>

            {/* 维度名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                维度名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dimension.name}
                onChange={(e) => onChange({ ...dimension, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: CPM"
              />
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={dimension.category}
                onChange={(e) => onChange({ ...dimension, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categoryOptions.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* 目标字段路径 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标字段路径 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dimension.targetPath}
                onChange={(e) => onChange({ ...dimension, targetPath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="例如: performanceData.cpm"
              />
            </div>

            {/* 数据类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据类型
              </label>
              <select
                value={dimension.type}
                onChange={(e) => onChange({ ...dimension, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="percentage">百分比</option>
                <option value="date">日期</option>
                <option value="price">价格</option>
              </select>
            </div>

            {/* 数据来源集合 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据来源
              </label>
              <select
                value={dimension.targetCollection || 'talents'}
                onChange={(e) => onChange({
                  ...dimension,
                  targetCollection: e.target.value as 'talents' | 'talent_performance'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="talents">达人主表 (talents)</option>
                <option value="talent_performance">表现数据 (talent_performance)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                指定从哪个集合读取此维度的数据
              </p>
            </div>

            {/* 价格类型（仅当 type = "price" 时显示）*/}
            {dimension.type === 'price' && priceTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  价格类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={dimension.priceType || ''}
                  onChange={(e) => onChange({ ...dimension, priceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择价格类型</option>
                  {priceTypes.map(pt => (
                    <option key={pt.key} value={pt.key}>
                      {pt.label} ({pt.key})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* 显示设置 Tab */}
        {activeTab === 'display' && (
          <div className="space-y-4">
            {/* 列宽 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                列宽（像素）
              </label>
              <input
                type="number"
                value={dimension.width}
                onChange={(e) => onChange({ ...dimension, width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="80"
                max="400"
              />
            </div>

            {/* 配置选项 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="defaultVisible"
                  checked={dimension.defaultVisible || false}
                  onChange={(e) => onChange({ ...dimension, defaultVisible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="defaultVisible" className="ml-2 text-sm text-gray-700">
                  默认显示（在列表页面默认显示此维度）
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sortable"
                  checked={dimension.sortable !== false}
                  onChange={(e) => onChange({ ...dimension, sortable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sortable" className="ml-2 text-sm text-gray-700">
                  可排序（允许用户点击列头排序）
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={dimension.pinned || false}
                  onChange={(e) => onChange({ ...dimension, pinned: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="pinned" className="ml-2 text-sm text-gray-700">
                  固定在左侧（不受横向滚动影响，始终可见）
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="required"
                  checked={dimension.required || false}
                  onChange={(e) => onChange({ ...dimension, required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                  必填数据（数据库记录必须包含此字段）
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 筛选配置 Tab */}
        {activeTab === 'filter' && (
          <div className="space-y-4">
            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <strong>提示：</strong>启用筛选后，此维度将出现在 Performance 页面的筛选面板中
            </div>

            {/* 启用筛选 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="filterable"
                checked={dimension.filterable || false}
                onChange={(e) => onChange({
                  ...dimension,
                  filterable: e.target.checked,
                  // 启用时设置默认值
                  filterType: e.target.checked ? (dimension.filterType || 'text') : undefined,
                  filterOrder: e.target.checked ? (dimension.filterOrder || 1) : undefined
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="filterable" className="ml-2 text-sm font-medium text-gray-700">
                启用筛选（允许用户通过此维度筛选数据）
              </label>
            </div>

            {/* 筛选详细配置（仅当 filterable 为 true 时显示）*/}
            {dimension.filterable && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                {/* 筛选器类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    筛选器类型
                  </label>
                  <select
                    value={dimension.filterType || 'text'}
                    onChange={(e) => onChange({
                      ...dimension,
                      filterType: e.target.value as 'text' | 'range' | 'enum',
                      // 切换类型时清空选项
                      filterOptions: e.target.value === 'enum' ? dimension.filterOptions : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">文本搜索（输入框模糊匹配）</option>
                    <option value="range">数值区间（最小值-最大值）</option>
                    <option value="enum">枚举多选（固定选项勾选）</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {dimension.filterType === 'text' && '适用于名称、ID等文本字段'}
                    {dimension.filterType === 'range' && '适用于数字、百分比等数值字段'}
                    {dimension.filterType === 'enum' && '适用于层级、状态等固定选项字段'}
                  </p>
                </div>

                {/* 筛选排序 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    筛选面板排序
                  </label>
                  <input
                    type="number"
                    value={dimension.filterOrder || 1}
                    onChange={(e) => onChange({ ...dimension, filterOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    数字越小，在筛选面板中显示越靠前
                  </p>
                </div>

                {/* 枚举选项（仅当 filterType = "enum" 时显示）*/}
                {dimension.filterType === 'enum' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      枚举选项 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={filterOptionsStr}
                      onChange={(e) => handleFilterOptionsChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="头部, 腰部, 尾部"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      多个选项用逗号分隔，如：头部, 腰部, 尾部
                    </p>
                    {dimension.filterOptions && dimension.filterOptions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {dimension.filterOptions.map((opt, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </div>
  );
}
