/**
 * 字段映射管理组件（完整CRUD版本）
 * Phase 7: 支持添加、编辑、删除映射规则
 */

import { useState } from 'react';
import { logger } from '../../utils/logger';
import type { FieldMappingRule } from '../../api/performance';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

interface FieldMappingManagerProps {
  mappings: FieldMappingRule[];
  onAdd: (rule: FieldMappingRule) => Promise<void>;
  onUpdate: (index: number, rule: FieldMappingRule) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}

export function FieldMappingManager({
  mappings,
  onAdd,
  onUpdate,
  onDelete
}: FieldMappingManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRule, setEditingRule] = useState<FieldMappingRule | null>(null);

  const handleAdd = () => {
    setEditingRule({
      excelHeader: '',
      targetPath: '',
      format: 'text',
      required: false,
      order: mappings.length
    });
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingRule({ ...mappings[index] });
  };

  const handleSave = async () => {
    if (!editingRule) return;

    // 验证
    if (!editingRule.excelHeader || !editingRule.targetPath) {
      alert('Excel列名和目标字段路径不能为空');
      return;
    }

    try {
      if (isAdding) {
        await onAdd(editingRule);
      } else if (editingIndex !== null) {
        await onUpdate(editingIndex, editingRule);
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
    setEditingRule(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          总计 {mappings.length} 个映射规则
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加映射规则
        </button>
      </div>

      {/* 映射规则列表 */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Excel列名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">目标字段路径</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">格式</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">必需</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((rule, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{rule.excelHeader}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{rule.targetPath}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.format === 'percentage' ? 'bg-purple-100 text-purple-700' :
                    rule.format === 'number' ? 'bg-green-100 text-green-700' :
                    rule.format === 'date' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {rule.format}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {rule.required ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(index)}
                      className="text-blue-600 hover:text-blue-800"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingIndex(index)}
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
            ))}
          </tbody>
        </table>

        {mappings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无映射规则，点击"添加映射规则"开始配置
          </div>
        )}
      </div>

      {/* 编辑/新增模态框 */}
      <Modal
        isOpen={isAdding || editingIndex !== null}
        title={isAdding ? '添加映射规则' : '编辑映射规则'}
        onClose={handleCloseModal}
        size="lg"
      >
        {editingRule && (
          <div className="space-y-4">
            {/* Excel列名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Excel列名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingRule.excelHeader}
                onChange={(e) => setEditingRule({ ...editingRule, excelHeader: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: CPM"
              />
            </div>

            {/* 目标字段路径 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标字段路径 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editingRule.targetPath}
                onChange={(e) => setEditingRule({ ...editingRule, targetPath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="例如: performanceData.cpm"
              />
              <p className="mt-1 text-xs text-gray-500">
                使用点表示法，例如：performanceData.cpm 或 performanceData.audienceGender.male
              </p>
            </div>

            {/* 数据格式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数据格式
              </label>
              <select
                value={editingRule.format}
                onChange={(e) => setEditingRule({ ...editingRule, format: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">文本 (text)</option>
                <option value="number">数字 (number)</option>
                <option value="percentage">百分比 (percentage)</option>
                <option value="date">日期 (date)</option>
              </select>
            </div>

            {/* 是否必需 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={editingRule.required || false}
                onChange={(e) => setEditingRule({ ...editingRule, required: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Excel必填列（导入时Excel文件必须包含此列）
              </label>
            </div>

            {/* 默认值 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                默认值（可选）
              </label>
              <input
                type="text"
                value={editingRule.defaultValue || ''}
                onChange={(e) => setEditingRule({ ...editingRule, defaultValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="当Excel中该列为空时使用的默认值"
              />
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
        message={`确定要删除映射规则"${deletingIndex !== null ? mappings[deletingIndex]?.excelHeader : ''}"吗？此操作不可恢复。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeletingIndex(null)}
      />
    </div>
  );
}
