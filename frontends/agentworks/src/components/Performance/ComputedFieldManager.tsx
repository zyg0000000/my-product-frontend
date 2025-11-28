/**
 * 计算字段管理组件
 * v2.0: 支持表达式公式编辑器
 *   - 表达式模式：支持复杂公式 "(A * 0.6 + B * 0.4) / C * 1000"
 *   - 简单模式：向后兼容，选择两个操作数和运算符
 */

import { useState, useMemo } from 'react';
import { message, Collapse, Button, Tag, Tooltip, Input, Select, InputNumber, Form, Space, Radio, Alert } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  FunctionOutlined,
  CodeOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { logger } from '../../utils/logger';
import type { ComputedFieldRule, ComputedFieldFormula, FieldMappingRule } from '../../api/performance';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

const { TextArea } = Input;

// 运算类型选项（简单模式）
const FORMULA_TYPES = [
  { value: 'division', label: '除法 (÷)', symbol: '÷' },
  { value: 'multiplication', label: '乘法 (×)', symbol: '×' },
  { value: 'addition', label: '加法 (+)', symbol: '+' },
  { value: 'subtraction', label: '减法 (-)', symbol: '-' },
];

// 支持的函数列表
const SUPPORTED_FUNCTIONS = [
  { name: 'min', desc: 'min(a, b, ...) - 返回最小值' },
  { name: 'max', desc: 'max(a, b, ...) - 返回最大值' },
  { name: 'abs', desc: 'abs(x) - 返回绝对值' },
  { name: 'round', desc: 'round(x, decimals?) - 四舍五入' },
  { name: 'floor', desc: 'floor(x) - 向下取整' },
  { name: 'ceil', desc: 'ceil(x) - 向上取整' },
  { name: 'sqrt', desc: 'sqrt(x) - 平方根' },
  { name: 'pow', desc: 'pow(base, exp) - 幂运算' },
  { name: 'if', desc: 'if(条件, 真值, 假值) - 条件判断' },
  { name: 'coalesce', desc: 'coalesce(a, b, ...) - 返回第一个非空值' },
];

interface ComputedFieldManagerProps {
  computedFields: ComputedFieldRule[];
  mappings: FieldMappingRule[];
  onAdd: (field: ComputedFieldRule) => Promise<void>;
  onUpdate: (index: number, field: ComputedFieldRule) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}

type FormulaMode = 'expression' | 'simple';

export function ComputedFieldManager({
  computedFields,
  mappings,
  onAdd,
  onUpdate,
  onDelete
}: ComputedFieldManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingField, setEditingField] = useState<ComputedFieldRule | null>(null);
  const [formulaMode, setFormulaMode] = useState<FormulaMode>('expression');
  const [showHelp, setShowHelp] = useState(false);

  // 获取可用的变量选项（从映射规则中提取）
  const variableOptions = useMemo(() => {
    const options: { value: string; label: string; group: string }[] = [];

    // 价格字段
    mappings.filter(m => m.priceType).forEach(m => {
      options.push({
        value: `prices.${m.priceType}`,
        label: `${m.excelHeader} (prices.${m.priceType})`,
        group: '价格字段'
      });
    });

    // 表现数据字段
    mappings.filter(m =>
      m.targetCollection === 'talent_performance' &&
      m.targetPath.startsWith('metrics.')
    ).forEach(m => {
      options.push({
        value: m.targetPath,
        label: `${m.excelHeader} (${m.targetPath})`,
        group: '表现数据'
      });
    });

    // 基础字段（数字类型）
    mappings.filter(m =>
      m.format === 'number' &&
      !m.priceType &&
      m.targetCollection !== 'talent_performance'
    ).forEach(m => {
      options.push({
        value: m.targetPath,
        label: `${m.excelHeader} (${m.targetPath})`,
        group: '基础信息'
      });
    });

    return options;
  }, [mappings]);

  // 按分组整理选项（用于简单模式）
  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof variableOptions> = {};
    variableOptions.forEach(opt => {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    });
    return Object.entries(groups).map(([label, options]) => ({
      label,
      options: options.map(o => ({ value: o.value, label: o.label }))
    }));
  }, [variableOptions]);

  const handleAdd = () => {
    setEditingField({
      id: '',
      name: '',
      targetPath: '',
      targetCollection: 'talent_performance',
      formula: {
        expression: '',
        precision: 2
      },
      category: '核心绩效',
      order: computedFields.length + 100
    });
    setFormulaMode('expression');
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    const field = computedFields[index];
    setEditingIndex(index);
    setEditingField({ ...field });
    // 根据已有配置判断模式
    setFormulaMode(field.formula.expression ? 'expression' : 'simple');
  };

  const handleSave = async () => {
    if (!editingField) return;

    // 基础验证
    if (!editingField.id || !editingField.name || !editingField.targetPath) {
      message.warning('ID、名称和目标路径不能为空');
      return;
    }

    // 公式验证
    if (formulaMode === 'expression') {
      if (!editingField.formula.expression?.trim()) {
        message.warning('请输入计算公式');
        return;
      }
    } else {
      if (!editingField.formula.operand1 || !editingField.formula.operand2) {
        message.warning('请选择两个操作数');
        return;
      }
    }

    try {
      // 清理不需要的字段
      const fieldToSave = { ...editingField };
      if (formulaMode === 'expression') {
        // 表达式模式：清除简单模式字段
        delete fieldToSave.formula.type;
        delete fieldToSave.formula.operand1;
        delete fieldToSave.formula.operand2;
        delete fieldToSave.formula.multiplier;
      } else {
        // 简单模式：清除表达式字段
        delete fieldToSave.formula.expression;
      }

      if (isAdding) {
        await onAdd(fieldToSave);
      } else if (editingIndex !== null) {
        await onUpdate(editingIndex, fieldToSave);
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
    setEditingField(null);
    setIsAdding(false);
    setShowHelp(false);
  };

  // 更新公式
  const updateFormula = (key: keyof ComputedFieldFormula, value: any) => {
    if (!editingField) return;
    setEditingField({
      ...editingField,
      formula: { ...editingField.formula, [key]: value }
    });
  };

  // 插入变量到表达式
  const insertVariable = (varName: string) => {
    if (!editingField) return;
    const currentExpr = editingField.formula.expression || '';
    updateFormula('expression', currentExpr + varName);
  };

  // 获取公式描述
  const getFormulaDescription = (field: ComputedFieldRule) => {
    const { formula } = field;
    if (formula.expression) {
      return formula.expression;
    }
    const type = FORMULA_TYPES.find(t => t.value === formula.type);
    const symbol = type?.symbol || '?';
    const multiplierStr = formula.multiplier && formula.multiplier !== 1 ? ` × ${formula.multiplier}` : '';
    return `${formula.operand1} ${symbol} ${formula.operand2}${multiplierStr}`;
  };

  // 判断是表达式还是简单模式
  const isExpressionMode = (field: ComputedFieldRule) => !!field.formula.expression;

  // 渲染单个计算字段行
  const renderFieldRow = (field: ComputedFieldRule, index: number) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-3 py-2 font-medium text-gray-900 text-sm">{field.name}</td>
      <td className="px-3 py-2 font-mono text-xs text-gray-600">{field.id}</td>
      <td className="px-3 py-2">
        <Tag color={isExpressionMode(field) ? 'blue' : 'purple'} icon={isExpressionMode(field) ? <CodeOutlined /> : <FunctionOutlined />}>
          {isExpressionMode(field) ? '表达式' : (FORMULA_TYPES.find(t => t.value === field.formula.type)?.label || '简单')}
        </Tag>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-gray-500 max-w-xs">
        <Tooltip title={getFormulaDescription(field)}>
          <span className="truncate block">{getFormulaDescription(field)}</span>
        </Tooltip>
      </td>
      <td className="px-3 py-2 text-center text-xs text-gray-500">
        {field.formula.precision ?? '-'}
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(index)} />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => setDeletingIndex(index)} />
          </Tooltip>
        </div>
      </td>
    </tr>
  );

  // 折叠面板内容
  const collapseItems = [
    {
      key: 'computed',
      label: (
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500"><CalculatorOutlined /></span>
            <span className="font-medium">计算字段</span>
            <Tag color="purple">{computedFields.length} 个</Tag>
          </div>
          <div className="text-sm text-gray-500">导入时自动计算</div>
        </div>
      ),
      children: (
        <div className="overflow-x-auto">
          {computedFields.length > 0 ? (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">名称</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">字段ID</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">模式</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 text-xs">公式</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 text-xs">精度</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 text-xs w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {computedFields.map((field, i) => renderFieldRow(field, i))}
                </tbody>
              </table>
              <div className="p-2 bg-gray-50 border-t">
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
                  添加计算字段
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalculatorOutlined className="text-3xl mb-2 text-gray-300" />
              <p>暂无计算字段</p>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAdd} className="mt-2">
                添加计算字段
              </Button>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          计算字段 {computedFields.length} 个
          <span className="ml-3 text-purple-600">导入时自动计算</span>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加计算字段
        </Button>
      </div>

      {/* 折叠面板 */}
      <Collapse
        defaultActiveKey={computedFields.length > 0 ? ['computed'] : []}
        items={collapseItems}
        className="bg-white"
      />

      {/* 编辑/新增模态框 */}
      <Modal
        isOpen={isAdding || editingIndex !== null}
        title={isAdding ? '添加计算字段' : '编辑计算字段'}
        onClose={handleCloseModal}
        size="lg"
      >
        {editingField && (
          <Form layout="vertical" className="space-y-4">
            {/* 基础信息 */}
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="字段ID" required tooltip="唯一标识符，如 cpm_60s_expected">
                <Input
                  value={editingField.id}
                  onChange={(e) => setEditingField({ ...editingField, id: e.target.value })}
                  placeholder="cpm_60s_expected"
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
              <Form.Item label="显示名称" required>
                <Input
                  value={editingField.name}
                  onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                  placeholder="60s预期CPM"
                />
              </Form.Item>
            </div>

            <Form.Item label="目标路径" required tooltip="计算结果存储的字段路径">
              <Input
                value={editingField.targetPath}
                onChange={(e) => setEditingField({ ...editingField, targetPath: e.target.value })}
                placeholder="metrics.cpm_60s_expected"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>

            {/* 公式模式选择 */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  <FunctionOutlined className="mr-2" />
                  公式配置
                </h4>
                <Radio.Group value={formulaMode} onChange={(e) => setFormulaMode(e.target.value)} size="small">
                  <Radio.Button value="expression"><CodeOutlined /> 表达式</Radio.Button>
                  <Radio.Button value="simple"><CalculatorOutlined /> 简单</Radio.Button>
                </Radio.Group>
              </div>
            </div>

            {/* 表达式模式 */}
            {formulaMode === 'expression' && (
              <>
                <Form.Item
                  label={
                    <span>
                      计算公式
                      <Button type="link" size="small" icon={<QuestionCircleOutlined />} onClick={() => setShowHelp(!showHelp)}>
                        帮助
                      </Button>
                    </span>
                  }
                  required
                >
                  <TextArea
                    value={editingField.formula.expression || ''}
                    onChange={(e) => updateFormula('expression', e.target.value)}
                    placeholder="例如: prices.video_60plus / metrics.expected_plays * 1000"
                    rows={3}
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>

                {/* 帮助信息 */}
                {showHelp && (
                  <Alert
                    type="info"
                    showIcon
                    message="表达式语法帮助"
                    description={
                      <div className="text-xs space-y-2 mt-2">
                        <p><strong>支持的运算符：</strong> + - * / () &gt; &lt; &gt;= &lt;= == !=</p>
                        <p><strong>支持的函数：</strong></p>
                        <ul className="list-disc pl-4 space-y-1">
                          {SUPPORTED_FUNCTIONS.map(f => (
                            <li key={f.name}><code>{f.desc}</code></li>
                          ))}
                        </ul>
                        <p><strong>示例：</strong></p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li><code>prices.video_60plus / metrics.expected_plays * 1000</code></li>
                          <li><code>(prices.video_60plus * 0.6 + prices.video_21_60 * 0.4) / metrics.expected_plays * 1000</code></li>
                          <li><code>if(metrics.expected_plays &gt; 0, prices.video_60plus / metrics.expected_plays * 1000, 0)</code></li>
                          <li><code>round(prices.video_60plus / metrics.expected_plays * 1000, 2)</code></li>
                        </ul>
                      </div>
                    }
                  />
                )}

                {/* 快速插入变量 */}
                <Form.Item label="快速插入变量">
                  <div className="flex flex-wrap gap-1">
                    {variableOptions.slice(0, 10).map(opt => (
                      <Tag
                        key={opt.value}
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => insertVariable(opt.value)}
                      >
                        {opt.value.split('.').pop()}
                      </Tag>
                    ))}
                    {variableOptions.length > 10 && (
                      <Tooltip title={variableOptions.slice(10).map(o => o.value).join(', ')}>
                        <Tag>+{variableOptions.length - 10} 更多</Tag>
                      </Tooltip>
                    )}
                  </div>
                </Form.Item>
              </>
            )}

            {/* 简单模式 */}
            {formulaMode === 'simple' && (
              <>
                <Form.Item label="运算类型">
                  <Select
                    value={editingField.formula.type || 'division'}
                    onChange={(value) => updateFormula('type', value)}
                    options={FORMULA_TYPES.map(t => ({
                      value: t.value,
                      label: `${t.label} - 操作数1 ${t.symbol} 操作数2`
                    }))}
                  />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item label="操作数1" required>
                    <Select
                      value={editingField.formula.operand1 || undefined}
                      onChange={(value) => updateFormula('operand1', value)}
                      placeholder="选择字段"
                      options={groupedOptions}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item label="操作数2" required>
                    <Select
                      value={editingField.formula.operand2 || undefined}
                      onChange={(value) => updateFormula('operand2', value)}
                      placeholder="选择字段"
                      options={groupedOptions}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                </div>

                <Form.Item label="结果乘数" tooltip="计算结果后乘以此数，如 CPM 需要 × 1000">
                  <InputNumber
                    value={editingField.formula.multiplier || 1}
                    onChange={(value) => updateFormula('multiplier', value)}
                    min={0}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </>
            )}

            {/* 通用配置 */}
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="小数精度">
                <InputNumber
                  value={editingField.formula.precision ?? 2}
                  onChange={(value) => updateFormula('precision', value)}
                  min={0}
                  max={10}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item label="分类">
                <Select
                  value={editingField.category || '核心绩效'}
                  onChange={(value) => setEditingField({ ...editingField, category: value })}
                  options={[
                    { value: '基础信息', label: '基础信息' },
                    { value: '核心绩效', label: '核心绩效' },
                    { value: '受众分析', label: '受众分析' },
                  ]}
                />
              </Form.Item>
            </div>

            {/* 公式预览 */}
            {(editingField.formula.expression || (editingField.formula.operand1 && editingField.formula.operand2)) && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-xs text-gray-500 mb-1">公式预览</div>
                <div className="font-mono text-sm text-purple-600">
                  {editingField.name || '结果'} = {getFormulaDescription(editingField)}
                </div>
              </div>
            )}

            {/* 按钮 */}
            <Form.Item className="mb-0 pt-4 border-t">
              <Space className="w-full justify-end">
                <Button onClick={handleCloseModal}>取消</Button>
                <Button type="primary" onClick={handleSave}>保存</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog
        isOpen={deletingIndex !== null}
        title="确认删除"
        message={`确定要删除计算字段"${deletingIndex !== null ? computedFields[deletingIndex]?.name : ''}"吗？`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        onCancel={() => setDeletingIndex(null)}
      />
    </div>
  );
}
