/**
 * 批量新增机构弹窗组件
 * 简化版：粘贴机构名称 + 预览 → 完成
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Button,
  Input,
  Table,
  Tag,
  Space,
  Popconfirm,
  Alert,
  Result,
  App,
} from 'antd';
import {
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { logger } from '../../utils/logger';

const { TextArea } = Input;

interface ParsedAgencyRow {
  key: string;
  name: string;
  isValid: boolean;
  errors: string[];
}

interface BulkCreateError {
  name: string;
  reason: string;
}

interface BatchCreateAgencyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchCreateAgencyModal({
  open,
  onClose,
  onSuccess,
}: BatchCreateAgencyModalProps) {
  const { message } = App.useApp();

  // 原始文本
  const [rawText, setRawText] = useState('');

  // 解析后的数据
  const [parsedData, setParsedData] = useState<ParsedAgencyRow[]>([]);

  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // 结果状态
  const [createResult, setCreateResult] = useState<{
    created: number;
    failed: number;
    total: number;
    errors: BulkCreateError[];
  } | null>(null);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);

  // 统计
  const validCount = useMemo(
    () => parsedData.filter(r => r.isValid).length,
    [parsedData]
  );
  const invalidCount = useMemo(
    () => parsedData.filter(r => !r.isValid).length,
    [parsedData]
  );

  // 重置所有状态
  const resetState = useCallback(() => {
    setRawText('');
    setParsedData([]);
    setCreateResult(null);
    setSubmitting(false);
    setParsing(false);
    setEditingKey(null);
    setEditingValue('');
  }, []);

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 重新校验单行
  const revalidateRow = (
    row: ParsedAgencyRow,
    allRows: ParsedAgencyRow[]
  ): ParsedAgencyRow => {
    const errors: string[] = [];

    if (!row.name || !row.name.trim()) {
      errors.push('缺少机构名称');
    }

    // 检查批次内重复（排除自己）
    const duplicateCount = allRows.filter(
      r => r.key !== row.key && r.name && r.name === row.name
    ).length;
    if (duplicateCount > 0) {
      errors.push('批次内重复');
    }

    return {
      ...row,
      isValid: errors.length === 0,
      errors,
    };
  };

  // 重新校验所有行
  const revalidateAllRows = (rows: ParsedAgencyRow[]): ParsedAgencyRow[] => {
    return rows.map(row => revalidateRow(row, rows));
  };

  // 解析粘贴的数据
  const handleParse = () => {
    if (!rawText.trim()) {
      message.warning('请先粘贴数据');
      return;
    }

    setParsing(true);

    try {
      // 分割行
      const lines = rawText.trim().split('\n');
      if (lines.length < 1) {
        message.warning('请粘贴数据');
        setParsing(false);
        return;
      }

      // 检查数据条数限制
      if (lines.length > 500) {
        message.error(`超过单次上限 500 条，当前 ${lines.length} 条`);
        setParsing(false);
        return;
      }

      // 用于检测批次内重复
      const seenNames = new Set<string>();

      const parsed: ParsedAgencyRow[] = lines
        .filter(line => line.trim())
        .map((line, index) => {
          const name = line.trim();
          const errors: string[] = [];

          // 校验必填字段
          if (!name) {
            errors.push('缺少机构名称');
          }

          // 检查批次内重复
          if (name && seenNames.has(name)) {
            errors.push('批次内重复');
          } else if (name) {
            seenNames.add(name);
          }

          return {
            key: `row_${index}`,
            name,
            isValid: errors.length === 0,
            errors,
          };
        });

      if (parsed.length === 0) {
        message.warning('未解析到有效数据');
        setParsing(false);
        return;
      }

      setParsedData(parsed);

      const valid = parsed.filter(r => r.isValid).length;
      const invalid = parsed.filter(r => !r.isValid).length;

      message.success(
        `解析完成：共 ${parsed.length} 条，有效 ${valid} 条${
          invalid > 0 ? `，错误 ${invalid} 条` : ''
        }`
      );
    } catch (error) {
      logger.error('解析数据失败:', error);
      message.error('解析数据失败，请检查格式');
    } finally {
      setParsing(false);
    }
  };

  // 开始编辑
  const startEditing = (record: ParsedAgencyRow) => {
    setEditingKey(record.key);
    setEditingValue(record.name || '');
  };

  // 保存编辑
  const saveEditing = () => {
    if (!editingKey) return;

    const newData = parsedData.map(row => {
      if (row.key === editingKey) {
        const updatedRow = { ...row, name: editingValue.trim() };
        return revalidateRow(updatedRow, parsedData);
      }
      return row;
    });

    const revalidatedData = revalidateAllRows(newData);
    setParsedData(revalidatedData);

    setEditingKey(null);
    setEditingValue('');
  };

  // 删除行
  const deleteRow = (key: string) => {
    const newData = parsedData.filter(row => row.key !== key);
    const revalidatedData = revalidateAllRows(newData);
    setParsedData(revalidatedData);
  };

  // 提交创建
  const handleSubmit = async () => {
    const validData = parsedData.filter(row => row.isValid);
    if (validData.length === 0) {
      message.warning('没有有效的数据可提交');
      return;
    }

    setSubmitting(true);

    try {
      const { bulkCreateAgencies } = await import('../../api/agency');

      const agencies = validData.map(row => ({
        name: row.name,
      }));

      const response = await bulkCreateAgencies({
        agencies,
      });

      if (response.success && response.data) {
        setCreateResult(response.data);

        if (response.data.created > 0) {
          message.success(`成功创建 ${response.data.created} 个机构`);
        }
      } else {
        message.error(response.message || '批量创建失败');
      }
    } catch (error) {
      logger.error('批量创建失败:', error);
      message.error('批量创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 完成并关闭
  const handleFinish = () => {
    if (createResult && createResult.created > 0) {
      onSuccess?.();
    }
    handleClose();
  };

  // 返回编辑
  const handleBackToEdit = () => {
    setCreateResult(null);
  };

  // 渲染可编辑单元格
  const renderEditableCell = (text: string, record: ParsedAgencyRow) => {
    const isEditing = editingKey === record.key;
    const hasError = !record.isValid && !text;

    if (isEditing) {
      return (
        <Input
          value={editingValue}
          onChange={e => setEditingValue(e.target.value)}
          onPressEnter={saveEditing}
          onBlur={saveEditing}
          autoFocus
          size="small"
        />
      );
    }

    return (
      <div
        className={`cursor-pointer px-1 py-0.5 rounded hover:bg-surface-sunken ${
          hasError
            ? 'border border-danger-300 dark:border-danger-600 bg-danger-50 dark:bg-danger-900/20'
            : ''
        }`}
        onClick={() => startEditing(record)}
      >
        {text || <span className="text-gray-300">点击编辑</span>}
      </div>
    );
  };

  // 预览表格列定义
  const previewColumns: ColumnsType<ParsedAgencyRow> = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: '机构名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => renderEditableCell(text, record),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => {
        if (record.isValid) {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              有效
            </Tag>
          );
        }
        return (
          <Space direction="vertical" size={0}>
            {record.errors.map((err, idx) => (
              <Tag icon={<CloseCircleOutlined />} color="error" key={idx}>
                {err}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Popconfirm
          title="确定删除这条数据吗？"
          onConfirm={() => deleteRow(record.key)}
          okText="删除"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  // 错误详情表格列
  const errorColumns: ColumnsType<BulkCreateError> = [
    {
      title: '机构名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '失败原因',
      dataIndex: 'reason',
      key: 'reason',
      render: text => (
        <span className="text-danger-600 dark:text-danger-400">{text}</span>
      ),
    },
  ];

  // 示例数据
  const exampleText = `美食传媒
生活MCN
时尚工作室`;

  // 渲染结果页面
  const renderResultContent = () => {
    if (!createResult) return null;

    const { created, failed, errors } = createResult;

    // 全部成功
    if (failed === 0 && created > 0) {
      return (
        <Result
          status="success"
          icon={<CheckCircleOutlined className="text-green-500" />}
          title="批量创建成功"
          subTitle={
            <div>
              成功创建{' '}
              <span className="text-success-600 dark:text-success-400 font-bold text-lg">
                {created}
              </span>{' '}
              个机构
            </div>
          }
        />
      );
    }

    // 部分成功
    if (created > 0 && failed > 0) {
      return (
        <div className="space-y-4">
          <Result
            status="warning"
            title="批量创建完成"
            subTitle={
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                    {created}
                  </div>
                  <div className="text-sm text-content-secondary">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                    {failed}
                  </div>
                  <div className="text-sm text-content-secondary">失败</div>
                </div>
              </div>
            }
          />

          {errors.length > 0 && (
            <div>
              <div className="text-sm font-medium text-content mb-2">
                失败详情：
              </div>
              <Table
                columns={errorColumns}
                dataSource={errors.map((e, i) => ({ ...e, key: i }))}
                size="small"
                pagination={false}
                scroll={{ y: 150 }}
              />
            </div>
          )}
        </div>
      );
    }

    // 全部失败
    if (created === 0 && failed > 0) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 py-2 px-3 bg-danger-50 dark:bg-danger-900/20 rounded">
            <CloseCircleOutlined className="text-danger-500 text-xl" />
            <span className="font-medium">批量创建失败</span>
            <span className="text-sm text-content-secondary">
              （{failed} 条数据全部创建失败）
            </span>
          </div>

          {errors.length > 0 && (
            <div>
              <div className="text-sm font-medium text-content mb-2">
                失败详情：
              </div>
              <Table
                columns={errorColumns}
                dataSource={errors.map((e, i) => ({ ...e, key: i }))}
                size="small"
                pagination={false}
                scroll={{ x: 'max-content', y: 280 }}
              />
            </div>
          )}
        </div>
      );
    }

    return (
      <Result status="info" title="无数据创建" subTitle="没有数据被创建" />
    );
  };

  // 渲染主内容
  const renderContent = () => {
    // 显示结果页
    if (createResult) {
      return renderResultContent();
    }

    // 编辑页面
    return (
      <div className="space-y-4">
        {/* 格式说明 */}
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <div>
              <div className="font-medium mb-1">必填：机构名称</div>
              <div className="text-xs text-content-secondary mb-1">
                每行一个机构名称（单次最多500条）
              </div>
              <div className="text-xs text-content-secondary mb-2">
                默认值：类型 = <strong>机构</strong> | 状态 ={' '}
                <strong>正常</strong> | 返点 = <strong>不设置</strong>
              </div>
              <pre className="bg-primary-50 p-2 rounded text-xs overflow-x-auto whitespace-pre m-0">
                {exampleText}
              </pre>
            </div>
          }
        />

        {/* 粘贴区域 */}
        <div>
          <div className="text-sm text-content-secondary mb-2">粘贴数据</div>
          <TextArea
            placeholder="在此粘贴从 Excel/飞书 复制的机构名称列表..."
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* 解析按钮 */}
        <div className="flex justify-end">
          <Button
            type="primary"
            onClick={handleParse}
            loading={parsing}
            disabled={!rawText.trim()}
          >
            解析数据
          </Button>
        </div>

        {/* 预览表格 */}
        {parsedData.length > 0 && (
          <div className="border-t pt-4">
            {/* 统计信息 */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                解析结果：共{' '}
                <span className="font-medium">{parsedData.length}</span> 条
                {validCount > 0 && (
                  <>
                    <span className="mx-1">|</span>
                    <span className="text-success-600 dark:text-success-400">
                      ✅ 有效 {validCount} 条
                    </span>
                  </>
                )}
                {invalidCount > 0 && (
                  <>
                    <span className="mx-1">|</span>
                    <span className="text-danger-600 dark:text-danger-400">
                      ❌ 错误 {invalidCount} 条
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 错误提示 */}
            {invalidCount > 0 && (
              <Alert
                type="warning"
                showIcon
                message="部分数据存在错误，您可以点击单元格进行编辑修正，或删除无效行"
                className="mb-3"
              />
            )}

            {/* 数据表格 */}
            <Table
              columns={previewColumns}
              dataSource={parsedData}
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content', y: 300 }}
              rowClassName={record =>
                !record.isValid ? 'bg-danger-50 dark:bg-danger-900/20' : ''
              }
            />
          </div>
        )}
      </div>
    );
  };

  // 渲染底部按钮
  const renderFooter = () => {
    if (createResult) {
      return (
        <div className="flex justify-between">
          <Button onClick={handleBackToEdit}>返回编辑</Button>
          <Button type="primary" onClick={handleFinish}>
            完成
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-between">
        <Button onClick={handleClose}>取消</Button>
        <Button
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={validCount === 0}
        >
          确认创建 {validCount > 0 ? `${validCount} 条` : ''}
        </Button>
      </div>
    );
  };

  return (
    <Modal
      title="批量新增机构"
      open={open}
      onCancel={handleClose}
      width={700}
      footer={renderFooter()}
      destroyOnHidden
    >
      <div className="py-2">{renderContent()}</div>
    </Modal>
  );
}

export default BatchCreateAgencyModal;
