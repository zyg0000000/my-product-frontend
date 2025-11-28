/**
 * 批量新增达人弹窗组件
 * 简化版：平台选择 + 粘贴数据 + 预览 → 完成
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Modal,
  Button,
  Radio,
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
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { bulkCreateTalents } from '../../api/talent';
import { getCurrentAgencyRebate } from '../../api/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../types/agency';
import type { Platform } from '../../types/talent';
import type { BulkCreateTalentItem, BulkCreateError } from '../../api/talent';
import type { ParsedTalentRow } from './types';
import { getPlatformFieldConfig, matchHeader, isHeaderRow } from './types';

const { TextArea } = Input;

interface BatchCreateTalentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPlatform?: Platform;
}

export function BatchCreateTalentModal({
  open,
  onClose,
  onSuccess,
  initialPlatform,
}: BatchCreateTalentModalProps) {
  const { message } = App.useApp();
  const { getPlatformList, getPlatformConfigByKey, getDefaultTalentTier } =
    usePlatformConfig(false);
  const platforms = getPlatformList();

  // 平台选择
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    initialPlatform || null
  );

  // 原始文本
  const [rawText, setRawText] = useState('');

  // 解析后的数据
  const [parsedData, setParsedData] = useState<ParsedTalentRow[]>([]);

  // 编辑状态
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
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

  // 野生达人返点率
  const [wildTalentRebateRate, setWildTalentRebateRate] = useState<
    number | null
  >(null);

  // 获取野生达人返点率
  useEffect(() => {
    if (!selectedPlatform) {
      setWildTalentRebateRate(null);
      return;
    }

    const fetchWildTalentRebate = async () => {
      try {
        const response = await getCurrentAgencyRebate({
          agencyId: AGENCY_INDIVIDUAL_ID,
          platform: selectedPlatform,
        });
        if (response.success && response.data) {
          setWildTalentRebateRate(response.data.rebateRate);
        } else {
          setWildTalentRebateRate(0);
        }
      } catch (error) {
        console.error('获取野生达人返点率失败:', error);
        setWildTalentRebateRate(0);
      }
    };

    fetchWildTalentRebate();
  }, [selectedPlatform]);

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
    setSelectedPlatform(initialPlatform || null);
    setRawText('');
    setParsedData([]);
    setCreateResult(null);
    setSubmitting(false);
    setParsing(false);
    setEditingKey(null);
    setEditingField(null);
    setEditingValue('');
  }, [initialPlatform]);

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 获取当前平台字段配置
  const fieldConfig = selectedPlatform
    ? getPlatformFieldConfig(selectedPlatform)
    : null;

  // 重新校验单行
  const revalidateRow = (
    row: ParsedTalentRow,
    allRows: ParsedTalentRow[],
    platform: Platform
  ): ParsedTalentRow => {
    const config = getPlatformFieldConfig(platform);
    const errors: string[] = [];

    if (!row.name) {
      errors.push('缺少达人昵称');
    }
    if (!row.platformAccountId) {
      errors.push(`缺少${config.accountIdLabel}`);
    }

    // 抖音平台：校验数字格式
    if (platform === 'douyin') {
      if (row.platformAccountId && !/^\d+$/.test(row.platformAccountId)) {
        errors.push('星图ID必须为纯数字');
      }
      if (row.uid && !/^\d+$/.test(row.uid)) {
        errors.push('UID必须为纯数字');
      }
    }

    // 检查批次内重复（排除自己）
    const duplicateCount = allRows.filter(
      r =>
        r.key !== row.key &&
        r.platformAccountId &&
        r.platformAccountId === row.platformAccountId
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
  const revalidateAllRows = (
    rows: ParsedTalentRow[],
    platform: Platform
  ): ParsedTalentRow[] => {
    return rows.map(row => revalidateRow(row, rows, platform));
  };

  // 解析粘贴的数据
  const handleParse = () => {
    if (!selectedPlatform) {
      message.warning('请先选择平台');
      return;
    }
    if (!rawText.trim()) {
      message.warning('请先粘贴数据');
      return;
    }

    setParsing(true);

    try {
      const config = getPlatformFieldConfig(selectedPlatform);

      // 分割行
      const lines = rawText.trim().split('\n');
      if (lines.length < 1) {
        message.warning('请粘贴数据');
        setParsing(false);
        return;
      }

      // 检测分隔符（Tab 或逗号）
      const delimiter = lines[0].includes('\t') ? '\t' : ',';

      // 解析第一行，判断是否为表头
      const firstLineValues = lines[0].split(delimiter).map(v => v.trim());
      const hasHeader = isHeaderRow(firstLineValues);

      // 调试日志
      console.log('[BatchCreate] 第一行数据:', firstLineValues);
      console.log('[BatchCreate] 是否识别为表头:', hasHeader);

      const fieldIndexMap: Record<string, number> = {};
      let dataStartIndex = 0;

      if (!hasHeader) {
        // 无表头：要求用户添加表头
        console.log('[BatchCreate] 未识别到表头，显示错误提示');
        message.error(
          '未识别到表头，请在第一行添加表头（如：昵称、星图ID、UID）'
        );
        setParsing(false);
        return;
      }

      // 有表头：使用表头匹配
      firstLineValues.forEach((header, index) => {
        const fieldName = matchHeader(header);
        if (fieldName && fieldIndexMap[fieldName] === undefined) {
          fieldIndexMap[fieldName] = index;
        }
      });
      dataStartIndex = 1;

      // 验证必填字段是否都识别到了
      const missingFields: string[] = [];

      if (fieldIndexMap['name'] === undefined) {
        missingFields.push('昵称');
      }
      if (fieldIndexMap['platformAccountId'] === undefined) {
        missingFields.push(config.accountIdLabel);
      }

      if (missingFields.length > 0) {
        message.error(
          `无法识别 ${missingFields.join('、')} 列，请确保数据包含中文昵称和数字ID`
        );
        setParsing(false);
        return;
      }

      // 解析数据行
      const dataLines = lines.slice(dataStartIndex);

      // 检查数据条数限制
      if (dataLines.length > 100) {
        message.error(`超过单次上限 100 条，当前 ${dataLines.length} 条`);
        setParsing(false);
        return;
      }

      if (dataLines.length === 0) {
        message.warning('没有数据行');
        setParsing(false);
        return;
      }

      // 用于检测批次内重复
      const seenAccountIds = new Set<string>();

      const parsed: ParsedTalentRow[] = dataLines
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(delimiter).map(v => v.trim());
          const errors: string[] = [];

          const name = values[fieldIndexMap['name']] || '';
          const platformAccountId =
            values[fieldIndexMap['platformAccountId']] || '';
          const uid =
            fieldIndexMap['uid'] !== undefined
              ? values[fieldIndexMap['uid']] || ''
              : '';

          // 校验必填字段
          if (!name) {
            errors.push('缺少达人昵称');
          }
          if (!platformAccountId) {
            errors.push(`缺少${config.accountIdLabel}`);
          }

          // 抖音平台：校验数字格式
          if (selectedPlatform === 'douyin') {
            if (platformAccountId && !/^\d+$/.test(platformAccountId)) {
              errors.push('星图ID必须为纯数字');
            }
            if (uid && !/^\d+$/.test(uid)) {
              errors.push('UID必须为纯数字');
            }
          }

          // 检查批次内重复
          if (platformAccountId && seenAccountIds.has(platformAccountId)) {
            errors.push('批次内重复');
          } else if (platformAccountId) {
            seenAccountIds.add(platformAccountId);
          }

          return {
            key: `row_${index}`,
            name,
            platformAccountId,
            uid,
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

      const headerHint = hasHeader
        ? '（已识别表头）'
        : '（无表头，按列顺序解析）';
      message.success(
        `解析完成${headerHint}：共 ${parsed.length} 条，有效 ${valid} 条${
          invalid > 0 ? `，错误 ${invalid} 条` : ''
        }`
      );
    } catch (error) {
      console.error('解析数据失败:', error);
      message.error('解析数据失败，请检查格式');
    } finally {
      setParsing(false);
    }
  };

  // 开始编辑
  const startEditing = (record: ParsedTalentRow, field: string) => {
    setEditingKey(record.key);
    setEditingField(field);
    setEditingValue((record as any)[field] || '');
  };

  // 保存编辑
  const saveEditing = () => {
    if (!editingKey || !editingField || !selectedPlatform) return;

    const newData = parsedData.map(row => {
      if (row.key === editingKey) {
        const updatedRow = { ...row, [editingField]: editingValue };
        return revalidateRow(updatedRow, parsedData, selectedPlatform);
      }
      return row;
    });

    const revalidatedData = revalidateAllRows(newData, selectedPlatform);
    setParsedData(revalidatedData);

    setEditingKey(null);
    setEditingField(null);
    setEditingValue('');
  };

  // 删除行
  const deleteRow = (key: string) => {
    if (!selectedPlatform) return;
    const newData = parsedData.filter(row => row.key !== key);
    const revalidatedData = revalidateAllRows(newData, selectedPlatform);
    setParsedData(revalidatedData);
  };

  // 提交创建
  const handleSubmit = async () => {
    if (!selectedPlatform) return;

    const validData = parsedData.filter(row => row.isValid);
    if (validData.length === 0) {
      message.warning('没有有效的数据可提交');
      return;
    }

    setSubmitting(true);

    try {
      // 获取该平台的默认达人等级
      const defaultTier = getDefaultTalentTier(selectedPlatform);
      const defaultTierLabel = defaultTier?.label || '尾部';

      const talents: BulkCreateTalentItem[] = validData.map(row => ({
        name: row.name,
        platformAccountId: row.platformAccountId,
        uid: row.uid || undefined,
        talentTier: defaultTierLabel,
        agencyId: 'individual', // 默认归属野生达人
      }));

      const response = await bulkCreateTalents({
        platform: selectedPlatform,
        talents,
      });

      if (response.success && response.data) {
        setCreateResult(response.data);

        if (response.data.created > 0) {
          message.success(`成功创建 ${response.data.created} 个达人`);
        }
      } else {
        message.error(response.message || '批量创建失败');
      }
    } catch (error) {
      console.error('批量创建失败:', error);
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
  const renderEditableCell = (
    text: string,
    record: ParsedTalentRow,
    field: string
  ) => {
    const isEditing = editingKey === record.key && editingField === field;
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
        className={`cursor-pointer px-1 py-0.5 rounded hover:bg-gray-100 ${
          hasError ? 'border border-red-300 bg-red-50' : ''
        }`}
        onClick={() => startEditing(record, field)}
      >
        {text || <span className="text-gray-300">点击编辑</span>}
      </div>
    );
  };

  // 预览表格列定义
  const previewColumns: ColumnsType<ParsedTalentRow> = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: '达人昵称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => renderEditableCell(text, record, 'name'),
    },
    {
      title: fieldConfig?.accountIdLabel || '平台ID',
      dataIndex: 'platformAccountId',
      key: 'platformAccountId',
      width: 150,
      render: (text, record) =>
        renderEditableCell(text, record, 'platformAccountId'),
    },
    ...(fieldConfig?.uidLabel
      ? [
          {
            title: fieldConfig.uidLabel,
            dataIndex: 'uid',
            key: 'uid',
            width: 120,
            render: (text: string, record: ParsedTalentRow) =>
              renderEditableCell(text, record, 'uid'),
          },
        ]
      : []),
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
      title: '达人昵称',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      ellipsis: true,
    },
    {
      title: fieldConfig?.accountIdLabel || '平台ID',
      dataIndex: 'platformAccountId',
      key: 'platformAccountId',
      width: 140,
      ellipsis: true,
    },
    {
      title: '失败原因',
      dataIndex: 'reason',
      key: 'reason',
      render: text => <span className="text-red-600">{text}</span>,
    },
  ];

  // 必填/可选字段说明
  const requiredFieldsText = selectedPlatform
    ? selectedPlatform === 'douyin'
      ? `必填：昵称、星图ID  |  可选：UID`
      : `必填：昵称、${fieldConfig?.accountIdLabel || '平台ID'}`
    : '';

  // 示例数据（带表头）
  const exampleText = selectedPlatform
    ? selectedPlatform === 'douyin'
      ? `昵称\t星图ID\tUID\n小明\t7388899321\t2326992519701580\n小红\t7388899322\t66598046050`
      : `昵称\t${fieldConfig?.accountIdLabel || '平台ID'}\n达人A\t12345678\n达人B\t23456789`
    : '';

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
              <span className="text-green-600 font-bold text-lg">
                {created}
              </span>{' '}
              个达人
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
                  <div className="text-2xl font-bold text-green-600">
                    {created}
                  </div>
                  <div className="text-sm text-gray-500">成功</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {failed}
                  </div>
                  <div className="text-sm text-gray-500">失败</div>
                </div>
              </div>
            }
          />

          {errors.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
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
          <div className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded">
            <CloseCircleOutlined className="text-red-500 text-xl" />
            <span className="font-medium">批量创建失败</span>
            <span className="text-sm text-gray-500">
              （{failed} 条数据全部创建失败）
            </span>
          </div>

          {errors.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
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
        {/* 平台选择 */}
        <div>
          <div className="text-sm text-gray-600 mb-2">选择平台</div>
          <Radio.Group
            value={selectedPlatform}
            onChange={e => {
              setSelectedPlatform(e.target.value);
              setParsedData([]); // 切换平台清空解析数据
            }}
            optionType="button"
            buttonStyle="solid"
          >
            {platforms.map(platform => {
              const config = getPlatformConfigByKey(platform);
              return (
                <Radio.Button key={platform} value={platform}>
                  {config?.name || platform}
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </div>

        {/* 格式说明 */}
        {selectedPlatform && (
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <div className="font-medium mb-1">{requiredFieldsText}</div>
                <div className="text-xs text-gray-500 mb-1">
                  首行必须为表头，列顺序任意（单次最多100条）
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  默认值：达人层级 ={' '}
                  <strong>
                    {getDefaultTalentTier(selectedPlatform)?.label || '未配置'}
                  </strong>{' '}
                  | 返点 ={' '}
                  <strong>
                    {wildTalentRebateRate !== null
                      ? `${wildTalentRebateRate}%`
                      : '加载中...'}
                  </strong>{' '}
                  | 商业归属 = <strong>野生达人</strong>
                </div>
                <pre className="bg-primary-50 p-2 rounded text-xs overflow-x-auto whitespace-pre m-0">
                  {exampleText}
                </pre>
              </div>
            }
          />
        )}

        {/* 粘贴区域 */}
        <div>
          <div className="text-sm text-gray-600 mb-2">粘贴数据</div>
          <TextArea
            placeholder={
              selectedPlatform
                ? '在此粘贴从 Excel/飞书 复制的数据...'
                : '请先选择平台'
            }
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            disabled={!selectedPlatform}
          />
        </div>

        {/* 解析按钮 */}
        <div className="flex justify-end">
          <Button
            type="primary"
            onClick={handleParse}
            loading={parsing}
            disabled={!selectedPlatform || !rawText.trim()}
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
                    <span className="text-green-600">
                      ✅ 有效 {validCount} 条
                    </span>
                  </>
                )}
                {invalidCount > 0 && (
                  <>
                    <span className="mx-1">|</span>
                    <span className="text-red-600">
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
              scroll={{ x: 'max-content', y: 200 }}
              rowClassName={record => (!record.isValid ? 'bg-red-50' : '')}
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
      title="批量新增达人"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={renderFooter()}
      destroyOnHidden
    >
      <div className="py-2">{renderContent()}</div>
    </Modal>
  );
}

export default BatchCreateTalentModal;
