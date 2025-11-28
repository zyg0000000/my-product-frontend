/**
 * 字段映射管理组件（完整CRUD版本 + 分类折叠）
 * v2.0: 支持按分类折叠展示，使用 Ant Design Collapse
 */

import { useState, useMemo } from 'react';
import {
  message,
  Collapse,
  Button,
  Tag,
  Tooltip,
  AutoComplete,
  Input,
  Select,
  Checkbox,
  Form,
  Space,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  LineChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { logger } from '../../utils/logger';
import type { FieldMappingRule, CategoryConfig } from '../../api/performance';
import { TRANSFORM_OPTIONS } from '../../api/performance';
import type { Platform } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

// 分类图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  基础信息: <UserOutlined />,
  核心绩效: <LineChartOutlined />,
  '受众分析-性别': <TeamOutlined />,
  '受众分析-年龄': <CalendarOutlined />,
  人群包分析: <AppstoreOutlined />,
};

// 默认分类配置
const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: '基础信息', order: 1, icon: 'user' },
  { name: '核心绩效', order: 2, icon: 'chart' },
  { name: '受众分析-性别', order: 3, icon: 'users' },
  { name: '受众分析-年龄', order: 4, icon: 'calendar' },
  { name: '人群包分析', order: 5, icon: 'group' },
];

interface FieldMappingManagerProps {
  mappings: FieldMappingRule[];
  platform: Platform;
  categories?: CategoryConfig[];
  onAdd: (rule: FieldMappingRule) => Promise<void>;
  onUpdate: (index: number, rule: FieldMappingRule) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}

export function FieldMappingManager({
  mappings,
  platform,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: FieldMappingManagerProps) {
  // 使用平台配置 Hook 获取价格类型
  const { getPlatformPriceTypes } = usePlatformConfig(true);
  const priceTypes = getPlatformPriceTypes(platform);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRule, setEditingRule] = useState<FieldMappingRule | null>(null);

  // 使用传入的分类或默认分类
  const categoryOptions = useMemo(() => {
    return categories && categories.length > 0
      ? [...categories].sort((a, b) => a.order - b.order)
      : DEFAULT_CATEGORIES;
  }, [categories]);

  // 按分类分组映射规则
  const groupedMappings = useMemo(() => {
    const groups: Record<
      string,
      { rules: FieldMappingRule[]; indices: number[] }
    > = {};

    // 初始化所有分类
    categoryOptions.forEach(cat => {
      groups[cat.name] = { rules: [], indices: [] };
    });

    // 分组
    mappings.forEach((rule, index) => {
      const category = rule.category || '基础信息';
      if (!groups[category]) {
        groups[category] = { rules: [], indices: [] };
      }
      groups[category].rules.push(rule);
      groups[category].indices.push(index);
    });

    return groups;
  }, [mappings, categoryOptions]);

  const handleAdd = (defaultCategory?: string) => {
    setEditingRule({
      excelHeader: '',
      targetPath: '',
      format: 'text',
      required: false,
      order: mappings.length,
      category: defaultCategory || '基础信息',
    });
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingRule({ ...mappings[index] });
  };

  const handleSave = async () => {
    if (!editingRule) return;

    if (!editingRule.excelHeader || !editingRule.targetPath) {
      message.warning('Excel列名和目标字段路径不能为空');
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

  // 渲染单个映射规则行
  const renderRuleRow = (rule: FieldMappingRule, globalIndex: number) => (
    <tr key={globalIndex} className="hover:bg-gray-50">
      <td className="px-3 py-2 font-medium text-gray-900 text-sm">
        {rule.excelHeader}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-gray-600">
        {rule.targetPath}
      </td>
      <td className="px-3 py-2">
        <Tag
          color={
            rule.targetCollection === 'talent_performance'
              ? 'purple'
              : 'default'
          }
        >
          {rule.targetCollection === 'talent_performance'
            ? '表现数据'
            : '达人主表'}
        </Tag>
      </td>
      <td className="px-3 py-2">
        <Tag
          color={
            rule.format === 'percentage'
              ? 'magenta'
              : rule.format === 'number'
                ? 'green'
                : rule.format === 'date'
                  ? 'blue'
                  : 'default'
          }
        >
          {rule.format}
        </Tag>
      </td>
      <td className="px-3 py-2 text-xs">
        {rule.priceType ? (
          <Tag color="orange">{rule.priceType}</Tag>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs">
        {rule.transform ? (
          <Tooltip
            title={
              TRANSFORM_OPTIONS.find(t => t.value === rule.transform)
                ?.description
            }
          >
            <Tag color="cyan">
              {TRANSFORM_OPTIONS.find(t => t.value === rule.transform)?.label ||
                rule.transform}
            </Tag>
          </Tooltip>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {rule.required ? (
          <span className="text-green-600">✓</span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(globalIndex)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDeletingIndex(globalIndex)}
            />
          </Tooltip>
        </div>
      </td>
    </tr>
  );

  // 生成 Collapse items
  const collapseItems = categoryOptions
    .filter(cat => groupedMappings[cat.name]?.rules.length > 0)
    .map(cat => {
      const group = groupedMappings[cat.name];
      return {
        key: cat.name,
        label: (
          <div className="flex items-center justify-between w-full pr-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                {CATEGORY_ICONS[cat.name] || <AppstoreOutlined />}
              </span>
              <span className="font-medium">{cat.name}</span>
              <Tag color="blue">{group.rules.length} 个映射</Tag>
            </div>
            <div className="text-sm text-gray-500">
              必填 {group.rules.filter(r => r.required).length} 个
            </div>
          </div>
        ),
        children: (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    Excel列名
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    目标路径
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    目标集合
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    格式
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    价格类型
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">
                    转换函数
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 text-xs">
                    必需
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 text-xs w-20">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {group.rules.map((rule, i) =>
                  renderRuleRow(rule, group.indices[i])
                )}
              </tbody>
            </table>
            <div className="p-2 bg-gray-50 border-t">
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAdd(cat.name)}
              >
                添加到此分类
              </Button>
            </div>
          </div>
        ),
      };
    });

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          总计 {mappings.length} 个映射规则
          <span className="ml-3 text-primary-600">
            必填 {mappings.filter(m => m.required).length} 个
          </span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleAdd()}
        >
          添加映射规则
        </Button>
      </div>

      {/* 分类折叠面板 */}
      {collapseItems.length > 0 ? (
        <Collapse
          defaultActiveKey={[]}
          items={collapseItems}
          className="bg-white"
        />
      ) : (
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          暂无映射规则，点击"添加映射规则"开始配置
        </div>
      )}

      {/* 编辑/新增模态框 */}
      <Modal
        isOpen={isAdding || editingIndex !== null}
        title={isAdding ? '添加映射规则' : '编辑映射规则'}
        onClose={handleCloseModal}
        size="lg"
      >
        {editingRule && (
          <Form layout="vertical" className="space-y-4">
            {/* 分类选择（支持输入新分类） */}
            <Form.Item
              label="分类"
              required
              tooltip="可从下拉列表选择，或直接输入新的分类名称"
            >
              <AutoComplete
                value={editingRule.category || '基础信息'}
                onChange={value =>
                  setEditingRule({ ...editingRule, category: value })
                }
                options={categoryOptions.map(cat => ({
                  value: cat.name,
                  label: cat.name,
                }))}
                placeholder="选择或输入新分类"
                allowClear
              />
            </Form.Item>

            {/* Excel列名 */}
            <Form.Item label="Excel列名" required>
              <Input
                value={editingRule.excelHeader}
                onChange={e =>
                  setEditingRule({
                    ...editingRule,
                    excelHeader: e.target.value,
                  })
                }
                placeholder="例如: CPM"
              />
            </Form.Item>

            {/* 目标字段路径 */}
            <Form.Item
              label="目标字段路径"
              required
              tooltip="使用点表示法，例如：metrics.cpm。价格字段请输入：prices"
            >
              <Input
                value={editingRule.targetPath}
                onChange={e =>
                  setEditingRule({ ...editingRule, targetPath: e.target.value })
                }
                placeholder="例如: metrics.cpm 或 prices（价格字段）"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            {/* 数据格式 */}
            <Form.Item label="数据格式">
              <Select
                value={editingRule.format}
                onChange={value =>
                  setEditingRule({ ...editingRule, format: value })
                }
                options={[
                  { value: 'text', label: '文本 (text)' },
                  { value: 'number', label: '数字 (number)' },
                  { value: 'percentage', label: '百分比 (percentage)' },
                  { value: 'date', label: '日期 (date)' },
                ]}
              />
            </Form.Item>

            {/* 目标集合 */}
            <Form.Item
              label="目标集合"
              tooltip="达人主表：基础信息、价格。表现数据：时序数据（CPM、粉丝画像等）"
            >
              <Select
                value={editingRule.targetCollection || 'talents'}
                onChange={value =>
                  setEditingRule({ ...editingRule, targetCollection: value })
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

            {/* 价格类型 */}
            {editingRule.targetPath === 'prices' && priceTypes.length > 0 && (
              <Form.Item label="价格类型" required>
                <Select
                  value={editingRule.priceType || undefined}
                  onChange={value =>
                    setEditingRule({ ...editingRule, priceType: value })
                  }
                  placeholder="请选择价格类型"
                  options={priceTypes.map(pt => ({
                    value: pt.key,
                    label: `${pt.label} (${pt.key})`,
                  }))}
                />
              </Form.Item>
            )}

            {/* 是否必需 */}
            <Form.Item>
              <Checkbox
                checked={editingRule.required || false}
                onChange={e =>
                  setEditingRule({ ...editingRule, required: e.target.checked })
                }
              >
                Excel必填列（导入时Excel文件必须包含此列）
              </Checkbox>
            </Form.Item>

            {/* 转换函数 */}
            <Form.Item
              label="转换函数（可选）"
              tooltip="对导入的值进行转换处理，如提取JSON中的key"
            >
              <Select
                value={editingRule.transform || undefined}
                onChange={value =>
                  setEditingRule({ ...editingRule, transform: value })
                }
                allowClear
                placeholder="选择转换函数（可选）"
                optionLabelProp="label"
              >
                {TRANSFORM_OPTIONS.map(t => (
                  <Select.Option key={t.value} value={t.value} label={t.label}>
                    <div>
                      <div>{t.label}</div>
                      <div className="text-xs text-gray-400">{t.description}</div>
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {/* 默认值 */}
            <Form.Item label="默认值（可选）">
              <Input
                value={editingRule.defaultValue || ''}
                onChange={e =>
                  setEditingRule({
                    ...editingRule,
                    defaultValue: e.target.value,
                  })
                }
                placeholder="当Excel中该列为空时使用的默认值"
              />
            </Form.Item>

            {/* 按钮 */}
            <Form.Item className="mb-0 pt-4 border-t">
              <Space className="w-full justify-end">
                <Button onClick={handleCloseModal}>取消</Button>
                <Button type="primary" onClick={handleSave}>
                  保存
                </Button>
              </Space>
            </Form.Item>
          </Form>
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
