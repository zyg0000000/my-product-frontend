/**
 * 平台配置编辑弹窗 - Ant Design Pro 版本
 *
 * 版本: v1.0.0
 * 更新时间: 2025-11-23
 *
 * 功能说明：
 * - 编辑平台配置（分 Tab 组织）
 * - Tab 1: 基础信息（名称、状态、颜色等）
 * - Tab 2: 账号ID配置
 * - Tab 3: 价格类型配置
 * - Tab 4: 业务配置
 * - Tab 5: 外链配置
 */

import { useState, useEffect } from 'react';
import { Modal, Tabs, Form, message, Switch, Tag, Space } from 'antd';
import { ProForm, ProFormText, ProFormDigit, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { ProCard } from '@ant-design/pro-components';
import type { PlatformConfig, PriceTypeConfig } from '../api/platformConfig';
import { updatePlatformConfig, createPlatformConfig } from '../api/platformConfig';
import { logger } from '../utils/logger';

interface PlatformConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlatformConfig | null;
  isCreating: boolean;
  onSave: () => Promise<void>;
}

export function PlatformConfigModal({
  isOpen,
  onClose,
  config,
  isCreating,
  onSave,
}: PlatformConfigModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (isCreating) {
        // 新增模式：设置默认值
        form.setFieldsValue({
          platform: '',
          name: '',
          enabled: true,
          color: 'blue',
          order: 5,
          accountIdLabel: '',
          accountIdPlaceholder: '',
          accountIdHelpText: '',
          fee: null,
          defaultRebate: 15,
          linkTemplate: '',
          linkIdField: '',
          priceManagement: false,
          performanceTracking: false,
          rebateManagement: true,
          dataImport: true,
        });
      } else if (config) {
        // 编辑模式：加载现有配置
        form.setFieldsValue({
          platform: config.platform,
          name: config.name,
          enabled: config.enabled,
          color: config.color,
          order: config.order,
          accountIdLabel: config.accountId?.label,
          accountIdPlaceholder: config.accountId?.placeholder,
          accountIdHelpText: config.accountId?.helpText,
          fee: config.business?.fee !== null ? config.business?.fee * 100 : null,
          defaultRebate: config.business?.defaultRebate,
          linkTemplate: config.link?.template,
          linkIdField: config.link?.idField,
          priceManagement: config.features?.priceManagement,
          performanceTracking: config.features?.performanceTracking,
          rebateManagement: config.features?.rebateManagement,
          dataImport: config.features?.dataImport,
        });
      }
    }
  }, [isOpen, config, isCreating, form]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      setSaving(true);

      // 构建配置数据
      const configData: any = {
        platform: isCreating ? values.platform : config!.platform,
        name: values.name,
        enabled: values.enabled,
        color: values.color,
        order: values.order,
        accountId: {
          label: values.accountIdLabel,
          placeholder: values.accountIdPlaceholder,
          helpText: values.accountIdHelpText || undefined,
        },
        business: {
          fee: values.fee !== null && values.fee !== undefined ? values.fee / 100 : null,
          defaultRebate: values.defaultRebate,
          minRebate: 0,
          maxRebate: 100,
        },
        link: values.linkTemplate ? {
          template: values.linkTemplate,
          idField: values.linkIdField || 'platformAccountId',
        } : null,
        features: {
          priceManagement: values.priceManagement ?? false,
          performanceTracking: values.performanceTracking ?? false,
          rebateManagement: values.rebateManagement ?? false,
          dataImport: values.dataImport ?? false,
        },
        priceTypes: config?.priceTypes || [],
        specificFields: config?.specificFields || {},
      };

      let response;

      if (isCreating) {
        // 新增平台
        response = await createPlatformConfig(configData);
        if (response.success) {
          message.success(`平台配置创建成功: ${values.name}`);
          await onSave();
        } else {
          message.error(response.message || '创建失败');
        }
      } else {
        // 更新平台
        response = await updatePlatformConfig(configData);
        if (response.success) {
          message.success(`平台配置更新成功: ${values.name}`);
          await onSave();
        } else {
          message.error(response.message || '更新失败');
        }
      }
    } catch (err: any) {
      logger.error(isCreating ? '创建平台配置失败:' : '更新平台配置失败:', err);
      message.error(err.message || (isCreating ? '创建失败' : '更新失败') + '，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基础信息',
      children: (
        <ProCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            {/* 新增模式下显示平台标识输入框 */}
            {isCreating && (
              <ProFormText
                name="platform"
                label="平台标识"
                placeholder="如：douyin, xiaohongshu"
                rules={[
                  { required: true, message: '请输入平台标识' },
                  { pattern: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线' }
                ]}
                extra="平台唯一标识，创建后不可修改"
              />
            )}

            <ProFormText
              name="name"
              label="平台名称"
              placeholder="请输入平台中文名称"
              rules={[{ required: true, message: '请输入平台名称' }]}
            />

            <ProFormDigit
              name="order"
              label="显示排序"
              placeholder="数字越小越靠前"
              fieldProps={{ min: 1, precision: 0 }}
              rules={[{ required: true, message: '请输入显示排序' }]}
            />

            <ProFormSelect
              name="color"
              label="主题配色"
              placeholder="选择主题色"
              options={[
                { label: '蓝色', value: 'blue' },
                { label: '红色', value: 'red' },
                { label: '绿色', value: 'green' },
                { label: '橙色', value: 'orange' },
                { label: '紫色', value: 'purple' },
                { label: '粉色', value: 'pink' },
                { label: '灰色', value: 'gray' },
              ]}
              rules={[{ required: true, message: '请选择主题配色' }]}
            />

            <Form.Item
              name="enabled"
              label="启用状态"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </Form.Item>
          </div>

          {/* 编辑模式下显示平台标识（只读） */}
          {!isCreating && config && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>平台标识</strong>: {config.platform}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                平台标识创建后不可修改
              </p>
            </div>
          )}
        </ProCard>
      ),
    },
    {
      key: 'accountId',
      label: '账号ID配置',
      children: (
        <ProCard>
          <ProFormText
            name="accountIdLabel"
            label="表单标签"
            placeholder="如：星图ID"
            rules={[{ required: true, message: '请输入表单标签' }]}
          />

          <ProFormText
            name="accountIdPlaceholder"
            label="输入框占位符"
            placeholder="如：请输入星图ID"
            rules={[{ required: true, message: '请输入占位符' }]}
          />

          <ProFormTextArea
            name="accountIdHelpText"
            label="帮助说明"
            placeholder="如：星图ID是抖音平台的唯一标识，可在星图后台查看"
            fieldProps={{
              rows: 3,
              maxLength: 200,
              showCount: true,
            }}
          />
        </ProCard>
      ),
    },
    // 仅在编辑模式显示价格类型Tab
    ...(!isCreating ? [{
      key: 'priceTypes',
      label: '价格类型',
      children: (
        <ProCard>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">当前价格类型：</p>
            <Space size="small" wrap>
              {config?.priceTypes && config.priceTypes.length > 0 ? (
                config.priceTypes.map((pt: PriceTypeConfig) => (
                  <Tag
                    key={pt.key}
                    style={{
                      backgroundColor: pt.bgColor,
                      color: pt.textColor,
                      border: 'none',
                    }}
                  >
                    {pt.label}
                  </Tag>
                ))
              ) : (
                <span className="text-gray-400">暂无价格类型</span>
              )}
            </Space>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              💡 <strong>提示</strong>: 价格类型配置较为复杂，暂不支持在界面中编辑。
            </p>
            <p className="text-xs text-gray-500 mt-2">
              如需修改价格类型，请在数据库中直接编辑或联系开发者。
            </p>
          </div>
        </ProCard>
      ),
    }] : []),
    {
      key: 'business',
      label: '业务配置',
      children: (
        <ProCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
            <ProFormDigit
              name="fee"
              label="平台费率 (%)"
              placeholder="如：5 表示 5%"
              fieldProps={{
                min: 0,
                max: 100,
                precision: 2,
                addonAfter: '%',
              }}
              extra="平台收取的服务费率，null 表示未配置"
            />

            <ProFormDigit
              name="defaultRebate"
              label="默认返点率 (%)"
              placeholder="如：15 表示 15%"
              fieldProps={{
                min: 0,
                max: 100,
                precision: 2,
                addonAfter: '%',
              }}
            />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">功能开关</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="priceManagement"
                label="价格管理"
                valuePropName="checked"
                extra="是否支持该平台的价格管理功能"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>

              <Form.Item
                name="rebateManagement"
                label="返点管理"
                valuePropName="checked"
                extra="是否支持该平台的返点管理功能"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>

              <Form.Item
                name="performanceTracking"
                label="达人数据"
                valuePropName="checked"
                extra="是否追踪该平台达人的表现数据"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>

              <Form.Item
                name="dataImport"
                label="数据导入"
                valuePropName="checked"
                extra="是否支持批量导入该平台的达人数据"
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </div>
          </div>
        </ProCard>
      ),
    },
    {
      key: 'link',
      label: '外链配置',
      children: (
        <ProCard>
          <ProFormText
            name="linkTemplate"
            label="URL 模板"
            placeholder="如：https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/{id}"
            extra="使用 {id} 作为占位符，将被实际ID替换"
          />

          <ProFormText
            name="linkIdField"
            label="ID 字段"
            placeholder="如：xingtuId"
            extra="指定使用哪个字段作为链接中的ID"
          />

          {!isCreating && config?.link && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>当前配置</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                模板: {config.link.template}
              </p>
              <p className="text-xs text-green-600">
                字段: {config.link.idField}
              </p>
            </div>
          )}
        </ProCard>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          <div className="text-lg font-semibold">
            {isCreating ? (
              <>新增平台配置</>
            ) : (
              <>编辑平台配置: <span className="text-blue-600">{config?.name}</span></>
            )}
          </div>
          <div className="text-sm font-normal text-gray-500 mt-0.5">
            {isCreating ? (
              <>创建新的平台配置</>
            ) : (
              <>平台标识: {config?.platform} · 版本: v{config?.version || 1}</>
            )}
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
      centered
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        loading={saving}
        submitter={{
          searchConfig: {
            submitText: '保存配置',
            resetText: '重置',
          },
          render: (_, dom) => (
            <div className="flex justify-end gap-2 pt-4 border-t">
              {dom}
            </div>
          ),
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="mb-4"
        />
      </ProForm>
    </Modal>
  );
}
