/**
 * 维度配置管理组件（完整CRUD版本 + 拖拽排序）
 * Phase 7: 支持添加、编辑、删除、拖拽排序、切换可见性
 */

import { useState } from 'react';
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
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

interface DimensionManagerProps {
  dimensions: DimensionConfig[];
  onAdd: (dimension: DimensionConfig) => Promise<void>;
  onUpdate: (index: number, dimension: DimensionConfig) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
  onReorder: (dimensions: DimensionConfig[]) => Promise<void>;
  onToggleVisibility: (dimensionId: string) => Promise<void>;
}

export function DimensionManager({
  dimensions,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onToggleVisibility
}: DimensionManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDimension, setEditingDimension] = useState<DimensionConfig | null>(null);

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
      alert('维度名称和目标字段路径不能为空');
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
          总计 {dimensions.length} 个维度
          <span className="ml-3 text-blue-600">
            默认显示 {dimensions.filter(d => d.defaultVisible).length} 个
          </span>
        </div>
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
            items={dimensions.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 w-12"></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">维度名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">分类</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">目标路径</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">类型</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">默认显示</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">固定列</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">可排序</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">宽度</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dimensions.map((dimension, index) => (
                  <SortableDimensionRow
                    key={dimension.id}
                    dimension={dimension}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={setDeletingIndex}
                    onToggleVisibility={onToggleVisibility}
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
          <div className="space-y-4">
            {/* 维度ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                维度ID
              </label>
              <input
                type="text"
                value={editingDimension.id}
                onChange={(e) => setEditingDimension({ ...editingDimension, id: e.target.value })}
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
                value={editingDimension.name}
                onChange={(e) => setEditingDimension({ ...editingDimension, name: e.target.value })}
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
                value={editingDimension.category}
                onChange={(e) => setEditingDimension({ ...editingDimension, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="基础信息">基础信息</option>
                <option value="核心指标">核心指标</option>
                <option value="粉丝画像">粉丝画像</option>
                <option value="人群包">人群包</option>
              </select>
            </div>

            {/* 目标字段路径 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标字段路径 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingDimension.targetPath}
                onChange={(e) => setEditingDimension({ ...editingDimension, targetPath: e.target.value })}
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
                value={editingDimension.type}
                onChange={(e) => setEditingDimension({ ...editingDimension, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="percentage">百分比</option>
                <option value="date">日期</option>
              </select>
            </div>

            {/* 列宽 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                列宽（像素）
              </label>
              <input
                type="number"
                value={editingDimension.width}
                onChange={(e) => setEditingDimension({ ...editingDimension, width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="80"
                max="400"
              />
            </div>

            {/* 配置选项 */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="defaultVisible"
                  checked={editingDimension.defaultVisible || false}
                  onChange={(e) => setEditingDimension({ ...editingDimension, defaultVisible: e.target.checked })}
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
                  checked={editingDimension.sortable !== false}
                  onChange={(e) => setEditingDimension({ ...editingDimension, sortable: e.target.checked })}
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
                  checked={editingDimension.pinned || false}
                  onChange={(e) => setEditingDimension({ ...editingDimension, pinned: e.target.checked })}
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
                  checked={editingDimension.required || false}
                  onChange={(e) => setEditingDimension({ ...editingDimension, required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                  必填数据（数据库记录必须包含此字段）
                </label>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
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

      {/* 默认显示切换 */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onToggleVisibility(dimension.id)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            dimension.defaultVisible
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {dimension.defaultVisible ? '显示' : '隐藏'}
        </button>
      </td>

      {/* 固定列标识 */}
      <td className="px-4 py-3 text-center">
        {dimension.pinned ? (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
            📌 固定
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
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
