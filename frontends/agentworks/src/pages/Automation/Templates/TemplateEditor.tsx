/**
 * 模板编辑弹窗
 *
 * @version 1.0.0
 * @description 新建/编辑映射模板，包含 4 个配置步骤
 * 1. 基础信息 - 模板名称、描述、类型
 * 2. 关联飞书模板 - 输入飞书表格 URL/Token + 加载表头
 * 3. 关联工作流 - 多选限制可用工作流（可选）
 * 4. 配置数据映射 - 为每个表头配置映射规则
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Spin,
  Collapse,
  Radio,
  Checkbox,
  Empty,
  App,
} from 'antd';
import {
  LoadingOutlined,
  FileTextOutlined,
  LinkOutlined,
  SettingOutlined,
  FunctionOutlined,
} from '@ant-design/icons';
import {
  useTemplates,
  useMappingSchemas,
  useSheetHeaders,
} from '../../../hooks/useTemplates';
import { useWorkflows } from '../../../hooks/useWorkflows';
import type {
  ReportTemplate,
  CreateTemplateRequest,
  MappingRule,
} from '../../../types/template';

interface TemplateEditorProps {
  open: boolean;
  templateId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

/** 映射规则模式 */
type MappingMode = 'direct' | 'formula';

/** 单个字段的映射配置 */
interface FieldMappingConfig {
  mode: MappingMode;
  directValue: string;
  formulaValue: string;
  outputFormat: 'default' | 'percentage' | 'number(0)' | 'number(2)';
}

export function TemplateEditor({
  open,
  templateId,
  onClose,
  onSuccess,
}: TemplateEditorProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // Hooks
  const { create, update, getById } = useTemplates({ autoLoad: false });
  const { schemas, loading: schemasLoading } =
    useMappingSchemas('registration');
  const {
    headers,
    loading: headersLoading,
    load: loadHeaders,
    clear: clearHeaders,
  } = useSheetHeaders();
  const { workflows, loading: workflowsLoading } = useWorkflows({
    activeOnly: true,
  });

  // 状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateData, setTemplateData] = useState<ReportTemplate | null>(null);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<
    Record<string, FieldMappingConfig>
  >({});

  // 是否编辑模式
  const isEditing = !!templateId;

  // 加载模板数据（编辑模式）
  useEffect(() => {
    if (open && templateId) {
      setLoading(true);
      getById(templateId)
        .then(template => {
          if (template) {
            setTemplateData(template);
            form.setFieldsValue({
              name: template.name,
              description: template.description,
              type: template.type,
              spreadsheetToken: template.spreadsheetToken,
            });
            setSelectedWorkflowIds(template.allowedWorkflowIds || []);
            // 初始化映射配置
            initFieldMappings(
              template.feishuSheetHeaders,
              template.mappingRules
            );
          }
        })
        .finally(() => setLoading(false));
    } else if (open && !templateId) {
      // 新建模式，重置表单
      form.resetFields();
      setTemplateData(null);
      setSelectedWorkflowIds([]);
      setFieldMappings({});
      clearHeaders();
    }
  }, [open, templateId, form, getById, clearHeaders]);

  // 初始化字段映射配置
  const initFieldMappings = useCallback(
    (headers: string[], rules: Record<string, MappingRule>) => {
      const mappings: Record<string, FieldMappingConfig> = {};
      headers.forEach(header => {
        const rule = rules[header];
        if (typeof rule === 'object' && rule !== null && 'formula' in rule) {
          mappings[header] = {
            mode: 'formula',
            directValue: '',
            formulaValue: rule.formula,
            outputFormat: rule.output as FieldMappingConfig['outputFormat'],
          };
        } else if (typeof rule === 'string') {
          mappings[header] = {
            mode: 'direct',
            directValue: rule,
            formulaValue: '',
            outputFormat: 'default',
          };
        } else {
          mappings[header] = {
            mode: 'direct',
            directValue: '',
            formulaValue: '',
            outputFormat: 'default',
          };
        }
      });
      setFieldMappings(mappings);
    },
    []
  );

  // 加载表头后初始化映射配置
  useEffect(() => {
    if (headers.length > 0 && Object.keys(fieldMappings).length === 0) {
      initFieldMappings(headers, templateData?.mappingRules || {});
    }
  }, [headers, fieldMappings, templateData, initFieldMappings]);

  // 处理加载表头
  const handleLoadHeaders = async () => {
    const token = form.getFieldValue('spreadsheetToken');
    if (!token?.trim()) {
      message.warning('请输入飞书表格链接或 Token');
      return;
    }
    const loadedHeaders = await loadHeaders(token);
    if (loadedHeaders.length > 0) {
      initFieldMappings(loadedHeaders, templateData?.mappingRules || {});
    }
  };

  // 当前显示的表头（优先使用加载的表头，否则使用模板中的表头）
  const displayHeaders = useMemo(() => {
    if (headers.length > 0) return headers;
    if (templateData?.feishuSheetHeaders)
      return templateData.feishuSheetHeaders;
    return [];
  }, [headers, templateData]);

  // 更新单个字段的映射配置
  const updateFieldMapping = useCallback(
    (header: string, updates: Partial<FieldMappingConfig>) => {
      setFieldMappings(prev => ({
        ...prev,
        [header]: { ...prev[header], ...updates },
      }));
    },
    []
  );

  // 构建数据源下拉选项
  const dataSourceOptions = useMemo(() => {
    if (!schemas) return [];
    const options: {
      label: string;
      options: { value: string; label: string }[];
    }[] = [];
    Object.entries(schemas).forEach(([collectionName, schema]) => {
      // 安全检查：确保 schema 和 fields 存在
      if (!schema || !Array.isArray(schema.fields)) return;
      options.push({
        label: schema.displayName || collectionName,
        options: schema.fields.map(field => ({
          value: `${collectionName}.${field.path}`,
          label: field.displayName || field.path,
        })),
      });
    });
    return options;
  }, [schemas]);

  // 处理保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 构建映射规则
      const mappingRules: Record<string, MappingRule> = {};
      displayHeaders.forEach(header => {
        const config = fieldMappings[header];
        if (!config) return;
        if (config.mode === 'formula' && config.formulaValue.trim()) {
          mappingRules[header] = {
            formula: config.formulaValue.trim(),
            output: config.outputFormat,
          };
        } else if (config.mode === 'direct' && config.directValue) {
          mappingRules[header] = config.directValue;
        }
      });

      const payload: CreateTemplateRequest = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
        type: values.type || 'registration',
        spreadsheetToken: values.spreadsheetToken.trim(),
        feishuSheetHeaders: displayHeaders,
        mappingRules,
        allowedWorkflowIds: selectedWorkflowIds,
      };

      let result;
      if (isEditing && templateId) {
        result = await update({ _id: templateId, ...payload });
      } else {
        result = await create(payload);
      }

      if (result) {
        onSuccess();
      }
    } catch (error) {
      console.error('Save template error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 渲染单个字段的映射配置
  const renderFieldMappingRow = (header: string) => {
    const config = fieldMappings[header] || {
      mode: 'direct',
      directValue: '',
      formulaValue: '',
      outputFormat: 'default',
    };

    return (
      <div
        key={header}
        className="p-4 bg-surface-sunken rounded-lg border border-stroke"
      >
        {/* 字段名称和模式切换 */}
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-content">{header}</span>
          <Radio.Group
            size="small"
            value={config.mode}
            onChange={e => updateFieldMapping(header, { mode: e.target.value })}
          >
            <Radio.Button value="direct">直接映射</Radio.Button>
            <Radio.Button value="formula">公式计算</Radio.Button>
          </Radio.Group>
        </div>

        {/* 配置内容 */}
        {config.mode === 'direct' ? (
          <Select
            className="w-full"
            placeholder="选择数据源字段"
            value={config.directValue || undefined}
            onChange={value =>
              updateFieldMapping(header, { directValue: value })
            }
            options={dataSourceOptions}
            allowClear
            showSearch
            optionFilterProp="label"
          />
        ) : (
          <div className="space-y-2">
            <Input.TextArea
              placeholder="例如: ({talents.latestPrice} / {metrics.plays}) * 1000"
              value={config.formulaValue}
              onChange={e =>
                updateFieldMapping(header, { formulaValue: e.target.value })
              }
              rows={2}
              className="font-mono text-sm"
            />
            <Select
              className="w-full"
              value={config.outputFormat}
              onChange={value =>
                updateFieldMapping(header, { outputFormat: value })
              }
              options={[
                { value: 'default', label: '默认输出' },
                { value: 'percentage', label: '格式化为百分比 (e.g., 58.34%)' },
                { value: 'number(0)', label: '整数' },
                { value: 'number(2)', label: '保留两位小数' },
              ]}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined className="text-primary-600" />
          <span>{isEditing ? '编辑映射模板' : '新建映射模板'}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          onClick={handleSave}
          disabled={displayHeaders.length === 0}
        >
          保存模板
        </Button>,
      ]}
      styles={{
        body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' },
      }}
    >
      {loading ? (
        <div className="py-16 text-center">
          <Spin indicator={<LoadingOutlined className="text-3xl" spin />} />
          <p className="mt-4 text-content-secondary">加载模板数据...</p>
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'registration' }}
        >
          <Collapse
            defaultActiveKey={['basic', 'feishu', 'workflow', 'mapping']}
            ghost
            items={[
              {
                key: 'basic',
                label: (
                  <span className="text-base font-semibold text-content">
                    1. 基础信息
                  </span>
                ),
                children: (
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                      name="name"
                      label="模板名称"
                      rules={[{ required: true, message: '请输入模板名称' }]}
                    >
                      <Input placeholder="例如：达人报名表" />
                    </Form.Item>
                    <Form.Item name="type" label="模板类型">
                      <Select
                        options={[
                          { value: 'registration', label: '报名管理' },
                          { value: 'general', label: '通用' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="description"
                      label="描述"
                      className="col-span-2"
                    >
                      <Input placeholder="可选，描述模板用途" />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: 'feishu',
                label: (
                  <span className="text-base font-semibold text-content flex items-center gap-2">
                    <LinkOutlined />
                    2. 关联飞书模板
                  </span>
                ),
                children: (
                  <div>
                    <Form.Item
                      name="spreadsheetToken"
                      label="飞书表格链接或 Token"
                      rules={[
                        { required: true, message: '请输入飞书表格链接' },
                      ]}
                    >
                      <Input.Search
                        placeholder="粘贴飞书表格的完整链接或 Token"
                        enterButton={
                          <Button loading={headersLoading}>加载表头</Button>
                        }
                        onSearch={handleLoadHeaders}
                      />
                    </Form.Item>
                    {displayHeaders.length > 0 && (
                      <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
                        <span className="text-success-700 dark:text-success-400">
                          已加载 {displayHeaders.length} 个表头：
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {displayHeaders.map(h => (
                            <span
                              key={h}
                              className="px-2 py-0.5 text-xs bg-success-100 dark:bg-success-900/40 text-success-800 dark:text-success-300 rounded"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'workflow',
                label: (
                  <span className="text-base font-semibold text-content flex items-center gap-2">
                    <SettingOutlined />
                    3. 关联工作流
                    <span className="text-sm font-normal text-content-muted">
                      (限制可用于生成此表格的任务类型)
                    </span>
                  </span>
                ),
                children: (
                  <div>
                    <p className="text-sm text-content-secondary mb-3">
                      选择哪些自动化工作流的任务可以用于生成此表格：
                    </p>
                    {workflowsLoading ? (
                      <div className="py-4 text-center text-content-muted">
                        正在加载工作流列表...
                      </div>
                    ) : workflows.length === 0 ? (
                      <div className="py-4 text-center text-content-muted">
                        暂无可用的工作流
                      </div>
                    ) : (
                      <div className="space-y-2 p-4 bg-surface-sunken rounded-lg border border-stroke max-h-48 overflow-y-auto">
                        {workflows.map(wf => (
                          <Checkbox
                            key={wf._id}
                            checked={selectedWorkflowIds.includes(wf._id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedWorkflowIds([
                                  ...selectedWorkflowIds,
                                  wf._id,
                                ]);
                              } else {
                                setSelectedWorkflowIds(
                                  selectedWorkflowIds.filter(
                                    id => id !== wf._id
                                  )
                                );
                              }
                            }}
                            className="block p-2 hover:bg-surface rounded"
                          >
                            <span className="font-medium">{wf.name}</span>
                            {wf.description && (
                              <span className="text-content-muted text-sm ml-2">
                                {wf.description}
                              </span>
                            )}
                          </Checkbox>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-content-muted mt-2">
                      提示：如果不选择任何工作流，则允许所有类型的任务。
                    </p>
                  </div>
                ),
              },
              {
                key: 'mapping',
                label: (
                  <span className="text-base font-semibold text-content flex items-center gap-2">
                    <FunctionOutlined />
                    4. 配置数据映射
                  </span>
                ),
                children: (
                  <div>
                    {schemasLoading ? (
                      <div className="py-8 text-center text-content-muted">
                        正在加载数据源配置...
                      </div>
                    ) : displayHeaders.length === 0 ? (
                      <Empty
                        description="请先加载飞书表格表头"
                        className="py-8"
                      />
                    ) : (
                      <div className="space-y-3">
                        {displayHeaders.map(header =>
                          renderFieldMappingRow(header)
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Form>
      )}
    </Modal>
  );
}

export default TemplateEditor;
