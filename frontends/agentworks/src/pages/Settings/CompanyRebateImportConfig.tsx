/**
 * 公司返点导入配置页面
 *
 * 版本: v1.0.0
 * 更新时间: 2025-12-22
 *
 * 功能说明：
 * - 配置 Excel 列映射（星图ID、昵称、MCN、返点）
 * - 配置返点解析规则（直接数值、正则、百分比）
 * - 预览解析效果
 * - 遵循 UI_UX_GUIDELINES.md 规范
 */

import { useState, useEffect, useCallback } from 'react';
import { ProCard } from '@ant-design/pro-components';
import {
  Form,
  Input,
  Select,
  Button,
  Space,
  Divider,
  Table,
  InputNumber,
  App,
  Spin,
  Upload,
  Alert,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { PageTransition } from '../../components/PageTransition';
import { get, post } from '../../api/client';

// ==================== 类型定义 ====================

interface CompanyRebateImportConfig {
  configType: 'company_rebate_import';
  columnMapping: {
    xingtuId: string;
    nickname: string;
    mcn: string;
    rebate: string;
  };
  rebateParser: {
    type: 'direct' | 'regex' | 'percent';
    pattern?: string;
    multiplier: number;
    groupIndex?: number;
  };
  version?: number;
  updatedAt?: string;
}

// 默认配置
const DEFAULT_CONFIG: CompanyRebateImportConfig = {
  configType: 'company_rebate_import',
  columnMapping: {
    xingtuId: '星图ID',
    nickname: '昵称',
    mcn: 'MCN',
    rebate: '备注',
  },
  rebateParser: {
    type: 'regex',
    // 综合匹配多种返点格式：
    // 1. 返点XX% 或 返点:XX% - 最明确的格式
    // 2. XX% - 百分比格式（30%、25%返点...）
    // 3. 0.XX - 小数格式（0.26 表示 26%）
    // 4. 返点XX - 返点+整数（返点20、返点35）
    // 5. 纯整数（1-2位数，如 30、25）
    pattern: '返点[：:]?(\\d+)%|(\\d+)%|(\\d+\\.\\d+)|返点(\\d+)|^(\\d{1,2})$',
    multiplier: 100,
    groupIndex: 1,
  },
};

// 测试数据（覆盖常见格式）
const TEST_DATA = [
  { raw: '0.26', expected: 26 }, // 纯小数
  { raw: 'sxskyskx0.26', expected: 26 }, // 文字+小数
  { raw: '30%返点按月变动', expected: 30 }, // 百分比+中文
  { raw: '返点30%', expected: 30 }, // 返点XX%
  { raw: '返点25', expected: 25 }, // 返点+整数
  { raw: '返点:20%', expected: 20 }, // 返点:XX%
  { raw: '30-35%', expected: 30 }, // 范围格式
  { raw: '25%', expected: 25 }, // 纯百分比
  { raw: '30', expected: 30 }, // 纯整数
  { raw: '野生达人组bd，询单二核；返点30%-40%', expected: 30 }, // 复杂文本
];

// ==================== 主组件 ====================

export function CompanyRebateImportConfig() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CompanyRebateImportConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{ raw: string; parsed: number | null; expected: number }>
  >([]);

  // 文件测试状态
  const [fileTestResults, setFileTestResults] = useState<
    Array<{
      xingtuId: string;
      nickname: string;
      mcn: string;
      rawRebate: string;
      parsedRebate: number | null;
    }>
  >([]);
  const [fileTestFileName, setFileTestFileName] = useState<string | null>(null);
  const [fileTestParsing, setFileTestParsing] = useState(false);
  const [fileTestStats, setFileTestStats] = useState<{
    total: number;
    success: number;
    failed: number;
    skipped: number; // 空值跳过
  } | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await get<{
        success: boolean;
        data: CompanyRebateImportConfig | null;
      }>('/platformConfigManager', { configType: 'company_rebate_import' });

      // 检查返回数据的完整性
      const data = response.data;
      const isValidConfig =
        response.success && data && data.columnMapping && data.rebateParser;

      if (isValidConfig) {
        setConfig(data);
        form.setFieldsValue({
          xingtuId: data.columnMapping.xingtuId,
          nickname: data.columnMapping.nickname,
          mcn: data.columnMapping.mcn,
          rebate: data.columnMapping.rebate,
          parserType: data.rebateParser.type,
          pattern: data.rebateParser.pattern,
          multiplier: data.rebateParser.multiplier,
          groupIndex: data.rebateParser.groupIndex,
        });
        setHasChanges(false);
      } else {
        // 使用默认配置，首次使用需要保存
        setConfig(DEFAULT_CONFIG);
        form.setFieldsValue({
          xingtuId: DEFAULT_CONFIG.columnMapping.xingtuId,
          nickname: DEFAULT_CONFIG.columnMapping.nickname,
          mcn: DEFAULT_CONFIG.columnMapping.mcn,
          rebate: DEFAULT_CONFIG.columnMapping.rebate,
          parserType: DEFAULT_CONFIG.rebateParser.type,
          pattern: DEFAULT_CONFIG.rebateParser.pattern,
          multiplier: DEFAULT_CONFIG.rebateParser.multiplier,
          groupIndex: DEFAULT_CONFIG.rebateParser.groupIndex,
        });
        // 首次使用，允许保存默认配置
        setHasChanges(true);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      // 出错时也使用默认配置
      setConfig(DEFAULT_CONFIG);
      form.setFieldsValue({
        xingtuId: DEFAULT_CONFIG.columnMapping.xingtuId,
        nickname: DEFAULT_CONFIG.columnMapping.nickname,
        mcn: DEFAULT_CONFIG.columnMapping.mcn,
        rebate: DEFAULT_CONFIG.columnMapping.rebate,
        parserType: DEFAULT_CONFIG.rebateParser.type,
        pattern: DEFAULT_CONFIG.rebateParser.pattern,
        multiplier: DEFAULT_CONFIG.rebateParser.multiplier,
        groupIndex: DEFAULT_CONFIG.rebateParser.groupIndex,
      });
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 表单值变化
  const handleValuesChange = () => {
    setHasChanges(true);
  };

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);

      const configData: CompanyRebateImportConfig = {
        configType: 'company_rebate_import',
        columnMapping: {
          xingtuId: values.xingtuId,
          nickname: values.nickname,
          mcn: values.mcn,
          rebate: values.rebate,
        },
        rebateParser: {
          type: values.parserType,
          pattern: values.pattern,
          multiplier: values.multiplier,
          groupIndex: values.groupIndex,
        },
      };

      const response = await post<{ success: boolean; message: string }>(
        '/platformConfigManager',
        configData
      );

      if (response.success) {
        message.success('配置保存成功');
        setHasChanges(false);
        await loadConfig();
      } else {
        message.error(response.message || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const handleReset = () => {
    loadConfig();
    setTestResults([]);
    message.info('已重置为上次保存的配置');
  };

  // 解析返点值
  const parseRebateValue = (
    raw: string,
    parserConfig: CompanyRebateImportConfig['rebateParser']
  ): number | null => {
    if (!raw || typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
      switch (parserConfig.type) {
        case 'direct': {
          const value = parseFloat(trimmed);
          if (isNaN(value)) return null;
          return value <= 1
            ? Math.round(value * parserConfig.multiplier)
            : Math.round(value);
        }

        case 'regex': {
          if (!parserConfig.pattern) return null;
          const regex = new RegExp(parserConfig.pattern);
          const match = trimmed.match(regex);
          if (!match) return null;
          // 支持多个捕获组，找第一个非空的匹配
          let value: number | null = null;
          for (let i = 1; i < match.length; i++) {
            if (match[i]) {
              value = parseFloat(match[i]);
              break;
            }
          }
          if (value === null || isNaN(value)) {
            value = parseFloat(match[0]);
          }
          if (isNaN(value)) return null;
          return value <= 1
            ? Math.round(value * parserConfig.multiplier)
            : Math.round(value);
        }

        case 'percent': {
          const percentMatch = trimmed.match(/(\d+\.?\d*)%?/);
          if (!percentMatch) return null;
          const value = parseFloat(percentMatch[1]);
          if (isNaN(value)) return null;
          return Math.round(value);
        }

        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  // 测试解析
  const handleTest = async () => {
    try {
      const values = await form.validateFields();

      const parserConfig: CompanyRebateImportConfig['rebateParser'] = {
        type: values.parserType,
        pattern: values.pattern,
        multiplier: values.multiplier,
        groupIndex: values.groupIndex,
      };

      const results = TEST_DATA.map(item => ({
        raw: item.raw,
        parsed: parseRebateValue(item.raw, parserConfig),
        expected: item.expected,
      }));

      setTestResults(results);
    } catch {
      message.error('请先填写完整配置');
    }
  };

  // 监听解析类型变化
  const parserType = Form.useWatch('parserType', form);

  // 获取列值的辅助函数
  const getColumnValue = (
    row: Record<string, unknown>,
    configColumnName: string,
    fallbackNames: string[]
  ): string => {
    if (row[configColumnName] !== undefined && row[configColumnName] !== null) {
      return String(row[configColumnName]).trim();
    }
    for (const name of fallbackNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return String(row[name]).trim();
      }
    }
    return '';
  };

  // 文件上传处理
  const handleFileUpload: UploadProps['customRequest'] = async options => {
    const file = options.file as File;
    setFileTestParsing(true);
    setFileTestFileName(file.name);
    setFileTestResults([]);
    setFileTestStats(null);

    try {
      const values = await form.validateFields();
      const parserConfig: CompanyRebateImportConfig['rebateParser'] = {
        type: values.parserType,
        pattern: values.pattern,
        multiplier: values.multiplier,
        groupIndex: values.groupIndex,
      };

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        message.error('Excel 文件为空');
        options.onError?.(new Error('Excel 文件为空'));
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData =
        XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (jsonData.length === 0) {
        message.error('Excel 文件没有数据行');
        options.onError?.(new Error('Excel 文件没有数据行'));
        return;
      }

      // 解析前 20 行作为预览
      const previewRows = jsonData.slice(0, 20);
      const results: typeof fileTestResults = [];
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      previewRows.forEach(row => {
        const xingtuId = getColumnValue(row, values.xingtuId, [
          '星图ID',
          '星图id',
          'xingtuId',
        ]);
        const nickname = getColumnValue(row, values.nickname, [
          '昵称',
          '达人昵称',
        ]);
        const mcn = getColumnValue(row, values.mcn, ['MCN', 'mcn', '机构']);
        const rawRebate = getColumnValue(row, values.rebate, [
          '备注',
          '返点',
          '返点率',
        ]);
        const parsedRebate = parseRebateValue(rawRebate, parserConfig);

        if (parsedRebate !== null) {
          successCount++;
        } else if (rawRebate) {
          failedCount++;
        } else {
          skippedCount++;
        }

        results.push({
          xingtuId,
          nickname,
          mcn,
          rawRebate,
          parsedRebate,
        });
      });

      // 统计全量数据
      let totalSuccess = successCount;
      let totalFailed = failedCount;
      let totalSkipped = skippedCount;

      if (jsonData.length > 20) {
        jsonData.slice(20).forEach(row => {
          const rawRebate = getColumnValue(row, values.rebate, [
            '备注',
            '返点',
            '返点率',
          ]);
          const parsedRebate = parseRebateValue(rawRebate, parserConfig);
          if (parsedRebate !== null) {
            totalSuccess++;
          } else if (rawRebate) {
            totalFailed++;
          } else {
            totalSkipped++;
          }
        });
      }

      setFileTestResults(results);
      setFileTestStats({
        total: jsonData.length,
        success: totalSuccess,
        failed: totalFailed,
        skipped: totalSkipped,
      });

      options.onSuccess?.(null);
      message.success(`文件解析完成，共 ${jsonData.length} 行`);
    } catch (err) {
      console.error('File parse error:', err);
      message.error('文件解析失败，请检查文件格式');
      options.onError?.(err as Error);
    } finally {
      setFileTestParsing(false);
    }
  };

  // 清除文件测试结果
  const clearFileTest = () => {
    setFileTestResults([]);
    setFileTestFileName(null);
    setFileTestStats(null);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <Spin size="large" tip="加载配置中..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content">
              公司返点导入配置
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              配置 Excel 文件的列映射和返点解析规则，用于返点对比功能
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            )}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              保存配置
            </Button>
          </div>
        </div>

        {/* 未保存提示 */}
        {hasChanges && (
          <div className="alert-warning">
            <div className="flex items-center gap-3">
              <ExclamationCircleOutlined className="alert-warning-icon text-lg" />
              <span className="alert-warning-text">
                您有未保存的更改，请点击「保存配置」按钮保存
              </span>
            </div>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          initialValues={{
            parserType: 'regex',
            multiplier: 100,
            groupIndex: 1,
          }}
        >
          {/* 列映射配置 */}
          <ProCard
            title="Excel 列映射"
            headerBordered
            className="mb-6"
            tooltip="配置 Excel 文件中各字段对应的列名，系统将根据列名读取数据"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Form.Item
                name="xingtuId"
                label="星图ID 列名"
                rules={[{ required: true, message: '请输入星图ID列名' }]}
                tooltip="Excel 中星图ID对应的列名（必填）"
              >
                <Input placeholder="例如：星图ID" />
              </Form.Item>

              <Form.Item
                name="nickname"
                label="昵称列名"
                tooltip="Excel 中达人昵称对应的列名"
              >
                <Input placeholder="例如：昵称" />
              </Form.Item>

              <Form.Item
                name="mcn"
                label="MCN 列名"
                tooltip="Excel 中 MCN 机构对应的列名"
              >
                <Input placeholder="例如：MCN" />
              </Form.Item>

              <Form.Item
                name="rebate"
                label="返点列名"
                tooltip="Excel 中返点数据对应的列名"
              >
                <Input placeholder="例如：备注 或 返点率" />
              </Form.Item>
            </div>
          </ProCard>

          {/* 返点解析规则 */}
          <ProCard
            title="返点解析规则"
            headerBordered
            className="mb-6"
            tooltip="配置如何从返点列中解析出返点数值（百分比整数，如 26 表示 26%）"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Form.Item
                name="parserType"
                label="解析模式"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="direct">直接数值</Select.Option>
                  <Select.Option value="regex">正则匹配</Select.Option>
                  <Select.Option value="percent">百分比格式</Select.Option>
                </Select>
              </Form.Item>

              {parserType === 'regex' && (
                <>
                  <Form.Item
                    name="pattern"
                    label="正则表达式"
                    rules={[{ required: true, message: '请输入正则表达式' }]}
                    tooltip="用于从文本中提取数值的正则表达式"
                  >
                    <Input placeholder="例如：\|(\d+\.?\d*)" />
                  </Form.Item>

                  <Form.Item
                    name="groupIndex"
                    label="捕获组序号"
                    tooltip="使用正则匹配结果的第几个捕获组（从1开始）"
                  >
                    <InputNumber
                      min={0}
                      max={10}
                      style={{ width: '100%' }}
                      placeholder="默认：1"
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item
                name="multiplier"
                label="乘数"
                tooltip="当数值小于等于1时，乘以此数转换为百分比（如 0.26 * 100 = 26）"
              >
                <InputNumber
                  min={1}
                  max={1000}
                  style={{ width: '100%' }}
                  placeholder="默认：100"
                />
              </Form.Item>
            </div>

            <Divider />

            {/* 解析模式说明 */}
            <div className="text-sm text-content-secondary space-y-2">
              <div>
                <strong className="text-content">直接数值：</strong>
                列中必须是纯数字，如{' '}
                <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                  26
                </code>{' '}
                或{' '}
                <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                  0.26
                </code>
              </div>
              <div>
                <strong className="text-content">正则匹配（推荐）：</strong>
                支持混合格式，默认正则可同时识别纯数字{' '}
                <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                  0.26
                </code>{' '}
                和竖线格式{' '}
                <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                  abc|0.26
                </code>
              </div>
              <div>
                <strong className="text-content">百分比格式：</strong>
                列中是百分比格式，如{' '}
                <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                  26%
                </code>
              </div>
            </div>
          </ProCard>

          {/* 解析测试 */}
          <ProCard title="解析测试" headerBordered className="mb-6">
            <div className="space-y-4">
              {/* 预设数据测试 */}
              <div>
                <Space className="mb-3">
                  <Button icon={<ExperimentOutlined />} onClick={handleTest}>
                    测试预设数据
                  </Button>
                  <span className="text-content-muted text-sm">
                    使用预设样本测试当前配置
                  </span>
                </Space>

                {testResults.length > 0 && (
                  <Table
                    dataSource={testResults}
                    rowKey="raw"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '原始值',
                        dataIndex: 'raw',
                        key: 'raw',
                        render: text => (
                          <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                            {text}
                          </code>
                        ),
                      },
                      {
                        title: '解析结果',
                        dataIndex: 'parsed',
                        key: 'parsed',
                        render: value =>
                          value !== null ? (
                            <span className="text-success-600 font-medium">
                              {value}%
                            </span>
                          ) : (
                            <span className="text-danger-500">解析失败</span>
                          ),
                      },
                      {
                        title: '期望值',
                        dataIndex: 'expected',
                        key: 'expected',
                        render: value => <span>{value}%</span>,
                      },
                      {
                        title: '状态',
                        key: 'status',
                        render: (_, record) =>
                          record.parsed === record.expected ? (
                            <span className="text-success-600">✓ 正确</span>
                          ) : (
                            <span className="text-danger-500">✗ 不匹配</span>
                          ),
                      },
                    ]}
                  />
                )}
              </div>

              <Divider />

              {/* 文件上传测试 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    customRequest={handleFileUpload}
                    disabled={fileTestParsing}
                  >
                    <Button icon={<UploadOutlined />} loading={fileTestParsing}>
                      上传样本文件测试
                    </Button>
                  </Upload>
                  {fileTestFileName && (
                    <>
                      <span className="text-content-secondary text-sm flex items-center gap-1">
                        <FileExcelOutlined />
                        {fileTestFileName}
                      </span>
                      <Button size="small" type="link" onClick={clearFileTest}>
                        清除
                      </Button>
                    </>
                  )}
                </div>

                {/* 文件测试统计 */}
                {fileTestStats && (
                  <Alert
                    type={fileTestStats.failed === 0 ? 'success' : 'warning'}
                    showIcon
                    className="mb-3"
                    message={
                      <span>
                        共{' '}
                        <strong>{fileTestStats.total.toLocaleString()}</strong>{' '}
                        行， 解析成功{' '}
                        <strong className="text-success-600">
                          {fileTestStats.success.toLocaleString()}
                        </strong>{' '}
                        行
                        {fileTestStats.failed > 0 && (
                          <>
                            ，失败{' '}
                            <strong className="text-danger-500">
                              {fileTestStats.failed.toLocaleString()}
                            </strong>{' '}
                            行
                          </>
                        )}
                        {fileTestStats.skipped > 0 && (
                          <>
                            ，跳过（空值）{' '}
                            <strong className="text-content-muted">
                              {fileTestStats.skipped.toLocaleString()}
                            </strong>{' '}
                            行
                          </>
                        )}
                      </span>
                    }
                  />
                )}

                {/* 文件测试结果表格 */}
                {fileTestResults.length > 0 && (
                  <>
                    <div className="text-xs text-content-muted mb-2">
                      预览前 20 行数据：
                    </div>
                    <Table
                      dataSource={fileTestResults}
                      rowKey={(_, index) => String(index)}
                      pagination={false}
                      size="small"
                      scroll={{ x: 600 }}
                      columns={[
                        {
                          title: '星图ID',
                          dataIndex: 'xingtuId',
                          key: 'xingtuId',
                          width: 120,
                          ellipsis: true,
                        },
                        {
                          title: '昵称',
                          dataIndex: 'nickname',
                          key: 'nickname',
                          width: 120,
                          ellipsis: true,
                        },
                        {
                          title: 'MCN',
                          dataIndex: 'mcn',
                          key: 'mcn',
                          width: 100,
                          ellipsis: true,
                        },
                        {
                          title: '返点原始值',
                          dataIndex: 'rawRebate',
                          key: 'rawRebate',
                          width: 150,
                          render: text => (
                            <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-xs">
                              {text || '-'}
                            </code>
                          ),
                        },
                        {
                          title: '解析结果',
                          dataIndex: 'parsedRebate',
                          key: 'parsedRebate',
                          width: 100,
                          render: value =>
                            value !== null ? (
                              <span className="text-success-600 font-medium">
                                {value}%
                              </span>
                            ) : (
                              <span className="text-danger-500">-</span>
                            ),
                        },
                      ]}
                    />
                  </>
                )}
              </div>
            </div>
          </ProCard>
        </Form>

        {/* 配置信息 */}
        {config?.version && (
          <div className="text-xs text-content-muted text-right">
            配置版本：v{config.version}
            {config.updatedAt &&
              ` · 更新时间：${new Date(config.updatedAt).toLocaleString()}`}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
