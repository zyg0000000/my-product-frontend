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
import {
  Modal,
  Tabs,
  Form,
  message,
  Switch,
  Tag,
  Button,
  Input,
  Popconfirm,
  ColorPicker,
} from 'antd';
import {
  ProForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { ProCard } from '@ant-design/pro-components';
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type {
  PlatformConfig,
  PriceTypeConfig,
  LinkConfig,
} from '../api/platformConfig';
import {
  updatePlatformConfig,
  createPlatformConfig,
} from '../api/platformConfig';
import { logger } from '../utils/logger';

/**
 * 数据来源选项配置
 * 可扩展：新增数据源只需在此添加
 */
const LINK_ID_SOURCE_OPTIONS = [
  {
    value: 'talent',
    label: '达人数据',
    description: '从达人 platformSpecific 获取',
    icon: '👤',
  },
  {
    value: 'collaboration',
    label: '合作记录',
    description: '从合作记录字段获取',
    icon: '🤝',
  },
  // 未来可扩展更多数据源
  // { value: 'project', label: '项目数据', description: '从项目字段获取', icon: '📁' },
];

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
  const [priceTypes, setPriceTypes] = useState<PriceTypeConfig[]>([]);
  const [linkPage, setLinkPage] = useState(0); // 外链配置当前页（0-indexed）

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
          links: [],
          priceManagement: false,
          performanceTracking: false,
          rebateManagement: true,
          dataImport: true,
        });
        setPriceTypes([]);
        setLinkPage(0);
      } else if (config) {
        // 编辑模式：加载现有配置
        // 兼容旧数据：如果有 links 用 links，否则从 link 转换
        // 重要：过滤掉数组中的 null/undefined 值
        const rawLinks =
          config.links ||
          (config.link
            ? [
                {
                  name: '外链',
                  label: '链接',
                  template: config.link.template,
                  idField: config.link.idField,
                },
              ]
            : []);
        const linksData: LinkConfig[] = rawLinks.filter(
          (link): link is LinkConfig => link !== null && link !== undefined
        );

        form.setFieldsValue({
          platform: config.platform,
          name: config.name,
          enabled: config.enabled,
          color: config.color,
          order: config.order,
          accountIdLabel: config.accountId?.label,
          accountIdPlaceholder: config.accountId?.placeholder,
          accountIdHelpText: config.accountId?.helpText,
          fee:
            config.business?.fee !== null ? config.business?.fee * 100 : null,
          defaultRebate: config.business?.defaultRebate,
          links: linksData,
          priceManagement: config.features?.priceManagement,
          performanceTracking: config.features?.performanceTracking,
          rebateManagement: config.features?.rebateManagement,
          dataImport: config.features?.dataImport,
        });
        // 加载价格类型配置
        setPriceTypes(config.priceTypes || []);
        setLinkPage(0);
      }
    }
  }, [isOpen, config, isCreating, form]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      setSaving(true);

      // 构建配置数据
      // 重要：编辑模式下必须保留原有数据中未被编辑的字段
      // 使用 ?? 运算符确保只有当值为 null/undefined 时才使用原有值
      const configData: any = {
        platform: isCreating ? values.platform : config!.platform,
        name: values.name,
        enabled: values.enabled,
        color: values.color,
        order: values.order,
        // accountId: 保留原有值，只覆盖用户明确填写的字段
        accountId: {
          label: values.accountIdLabel ?? config?.accountId?.label,
          placeholder:
            values.accountIdPlaceholder ?? config?.accountId?.placeholder,
          helpText: values.accountIdHelpText ?? config?.accountId?.helpText,
        },
        // business: 保留原有值
        business: {
          fee:
            values.fee !== null && values.fee !== undefined
              ? values.fee / 100
              : (config?.business?.fee ?? null),
          defaultRebate:
            values.defaultRebate ?? config?.business?.defaultRebate ?? 15,
          minRebate: config?.business?.minRebate ?? 0,
          maxRebate: config?.business?.maxRebate ?? 100,
        },
        // links: 使用新的多链接配置，过滤掉 null/undefined 的无效项
        links: (values.links || []).filter(
          (link: LinkConfig | null | undefined) =>
            link && link.name && link.template
        ),
        // link: 保留向后兼容（deprecated）
        link: null,
        // features: 使用表单值，fallback 到原有配置
        features: {
          priceManagement:
            values.priceManagement ??
            config?.features?.priceManagement ??
            false,
          performanceTracking:
            values.performanceTracking ??
            config?.features?.performanceTracking ??
            false,
          rebateManagement:
            values.rebateManagement ??
            config?.features?.rebateManagement ??
            false,
          dataImport:
            values.dataImport ?? config?.features?.dataImport ?? false,
        },
        // priceTypes: 合并原有数据中的 required 等字段
        priceTypes: priceTypes.map(pt => {
          const original = config?.priceTypes?.find(op => op.key === pt.key);
          return {
            ...original, // 保留原有字段（如 required）
            ...pt, // 覆盖用户编辑的字段
          };
        }),
        // specificFields: 编辑模式下必须保留
        specificFields: isCreating ? {} : config?.specificFields || {},
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
      message.error(
        err.message || (isCreating ? '创建失败' : '更新失败') + '，请稍后重试'
      );
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
                  {
                    pattern: /^[a-z0-9_]+$/,
                    message: '只能包含小写字母、数字和下划线',
                  },
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

            <Form.Item name="enabled" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </div>

          {/* 编辑模式下显示平台标识（只读） */}
          {!isCreating && config && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-800">
                <strong>平台标识</strong>: {config.platform}
              </p>
              <p className="text-xs text-primary-600 mt-1">
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
    // 价格类型配置 Tab
    {
      key: 'priceTypes',
      label: '价格类型',
      children: (
        <ProCard>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-content-secondary">
              配置该平台的价格类型（如：60s以上视频、图文笔记等）
            </p>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => {
                const newPriceType: PriceTypeConfig = {
                  key: `price_${Date.now()}`,
                  label: '',
                  bgColor: '#dbeafe',
                  textColor: '#1e40af',
                  order: priceTypes.length + 1,
                };
                setPriceTypes([...priceTypes, newPriceType]);
              }}
            >
              新增价格类型
            </Button>
          </div>

          {priceTypes.length === 0 ? (
            <div className="text-center py-8 text-content-muted">
              暂无价格类型配置，点击上方按钮添加
            </div>
          ) : (
            <div className="space-y-3">
              {priceTypes
                .map((pt, index) => ({ ...pt, _index: index }))
                .sort((a, b) => a.order - b.order)
                .map(pt => (
                  <div
                    key={pt._index}
                    className="flex items-center gap-3 p-3 bg-surface-base rounded-lg"
                  >
                    <HolderOutlined className="text-content-muted cursor-move" />

                    <Input
                      placeholder="类型标识(英文)"
                      value={pt.key}
                      onChange={e => {
                        const updated = [...priceTypes];
                        updated[pt._index] = {
                          ...updated[pt._index],
                          key: e.target.value,
                        };
                        setPriceTypes(updated);
                      }}
                      style={{ width: 140 }}
                    />

                    <Input
                      placeholder="显示名称"
                      value={pt.label}
                      onChange={e => {
                        const updated = [...priceTypes];
                        updated[pt._index] = {
                          ...updated[pt._index],
                          label: e.target.value,
                        };
                        setPriceTypes(updated);
                      }}
                      style={{ width: 120 }}
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-content-secondary">
                        背景:
                      </span>
                      <ColorPicker
                        value={pt.bgColor}
                        size="small"
                        onChange={color => {
                          const updated = [...priceTypes];
                          updated[pt._index] = {
                            ...updated[pt._index],
                            bgColor: color.toHexString(),
                          };
                          setPriceTypes(updated);
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-content-secondary">
                        文字:
                      </span>
                      <ColorPicker
                        value={pt.textColor}
                        size="small"
                        onChange={color => {
                          const updated = [...priceTypes];
                          updated[pt._index] = {
                            ...updated[pt._index],
                            textColor: color.toHexString(),
                          };
                          setPriceTypes(updated);
                        }}
                      />
                    </div>

                    <Tag
                      style={{
                        backgroundColor: pt.bgColor,
                        color: pt.textColor,
                        border: 'none',
                      }}
                    >
                      {pt.label || '预览'}
                    </Tag>

                    <div className="flex-1" />

                    <Popconfirm
                      title="确定删除该价格类型？"
                      onConfirm={() => {
                        const updated = priceTypes
                          .filter((_, i) => i !== pt._index)
                          .map((p, i) => ({ ...p, order: i + 1 }));
                        setPriceTypes(updated);
                      }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                      />
                    </Popconfirm>
                  </div>
                ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-primary-50 rounded-lg">
            <p className="text-xs text-primary-700">
              💡 <strong>说明</strong>:
              类型标识(key)用于数据存储，请使用英文小写和下划线（如：video_60plus）
            </p>
          </div>
        </ProCard>
      ),
    },
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
                suffix: '%',
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
                suffix: '%',
              }}
            />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-content mb-3">功能开关</p>
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
      key: 'links',
      label: '外链配置',
      children: (
        <div className="space-y-4">
          {/* Form.List 渲染所有外链，用 CSS 控制显示/隐藏 */}
          <Form.List name="links">
            {(fields, { add, remove }) => (
              <>
                {/* 渲染所有配置卡片，只显示当前页 */}
                {fields.map((field, index) => (
                  <div
                    key={field.key}
                    className="rounded-xl border border-stroke bg-gradient-to-br from-white to-gray-50/80 shadow-sm"
                    style={{ display: index === linkPage ? 'block' : 'none' }}
                  >
                    {/* 卡片头部 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-stroke bg-surface-base/60 rounded-t-xl">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-content">
                          外链配置
                        </span>
                      </div>
                      <Popconfirm
                        title="确定删除此外链配置？"
                        onConfirm={() => {
                          remove(field.name);
                          // 删除后调整页码
                          if (linkPage >= fields.length - 1 && linkPage > 0) {
                            setLinkPage(linkPage - 1);
                          }
                        }}
                        okText="删除"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </div>
                    {/* 卡片内容 */}
                    <div className="p-5">
                      {/* 基础信息区 */}
                      <div className="grid grid-cols-3 gap-4">
                        <Form.Item
                          name={[field.name, 'name']}
                          label={
                            <span className="text-xs text-content-secondary font-medium">
                              链接名称
                            </span>
                          }
                          rules={[{ required: true, message: '请输入名称' }]}
                        >
                          <Input placeholder="如：星图主页" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'label']}
                          label={
                            <span className="text-xs text-content-secondary font-medium">
                              显示标签
                            </span>
                          }
                          rules={[
                            { required: true, message: '请输入标签' },
                            {
                              pattern: /^[\u4e00-\u9fa5]{2}$/,
                              message: '限2个中文',
                            },
                          ]}
                          tooltip="在列表中显示的标签文字"
                        >
                          <Input placeholder="2个中文字" maxLength={2} />
                        </Form.Item>
                        <ProFormSelect
                          name={[field.name, 'idSource']}
                          label={
                            <span className="text-xs text-content-secondary font-medium">
                              数据来源
                            </span>
                          }
                          initialValue="talent"
                          tooltip={
                            <div className="space-y-1">
                              {LINK_ID_SOURCE_OPTIONS.map(opt => (
                                <div key={opt.value}>
                                  <strong>
                                    {opt.icon} {opt.label}
                                  </strong>
                                  ：{opt.description}
                                </div>
                              ))}
                            </div>
                          }
                          options={LINK_ID_SOURCE_OPTIONS.map(opt => ({
                            label: `${opt.icon} ${opt.label}`,
                            value: opt.value,
                          }))}
                          fieldProps={{ placeholder: '选择来源' }}
                        />
                      </div>
                      {/* URL 配置区 */}
                      <div className="grid grid-cols-3 gap-4 mt-1">
                        <div className="col-span-2">
                          <Form.Item
                            name={[field.name, 'template']}
                            label={
                              <span className="text-xs text-content-secondary font-medium">
                                URL 模板
                              </span>
                            }
                            rules={[
                              { required: true, message: '请输入URL模板' },
                            ]}
                            tooltip="使用 {id} 作为动态ID占位符"
                          >
                            <Input placeholder="https://www.example.com/path/{id}" />
                          </Form.Item>
                        </div>
                        <Form.Item
                          name={[field.name, 'idField']}
                          label={
                            <span className="text-xs text-content-secondary font-medium">
                              ID 字段名
                            </span>
                          }
                          rules={[{ required: true, message: '请输入字段名' }]}
                          tooltip="数据源中对应的字段名"
                        >
                          <Input placeholder="如：xingtuId" />
                        </Form.Item>
                      </div>
                      {/* 显示位置区 */}
                      <div className="mt-4 pt-4 border-t border-dashed border-stroke">
                        <div className="text-xs text-content-muted font-medium mb-3">
                          显示位置
                        </div>
                        <div className="flex gap-8">
                          <Form.Item
                            name={[field.name, 'showInTalentName']}
                            valuePropName="checked"
                            initialValue={true}
                            className="mb-0"
                          >
                            <Switch
                              checkedChildren="达人昵称旁"
                              unCheckedChildren="达人昵称旁"
                              defaultChecked
                            />
                          </Form.Item>
                          <Form.Item
                            name={[field.name, 'showInCollaboration']}
                            valuePropName="checked"
                            initialValue={false}
                            className="mb-0"
                          >
                            <Switch
                              checkedChildren="合作记录中"
                              unCheckedChildren="合作记录中"
                            />
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 空状态 */}
                {fields.length === 0 && (
                  <div className="text-center py-12 text-content-muted border border-dashed border-stroke rounded-xl bg-surface-base/50">
                    <div className="text-3xl mb-2">🔗</div>
                    <div className="text-sm">暂无外链配置</div>
                    <div className="text-xs mt-1">
                      点击下方「添加外链」按钮创建
                    </div>
                  </div>
                )}

                {/* 翻页控制 + 添加按钮 */}
                <div className="flex items-center justify-between pt-2">
                  {/* 左侧：添加按钮 */}
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      add({
                        name: '',
                        label: '',
                        template: '',
                        idField: '',
                        idSource: 'talent',
                        showInTalentName: true,
                        showInCollaboration: false,
                      });
                      // 跳转到新增的页
                      setLinkPage(fields.length);
                    }}
                  >
                    添加外链
                  </Button>

                  {/* 右侧：翻页器 */}
                  {fields.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Button
                        type="text"
                        icon={<LeftOutlined />}
                        disabled={linkPage === 0}
                        onClick={() => setLinkPage(p => Math.max(0, p - 1))}
                        className="!px-2"
                      />
                      <div className="flex items-center gap-1.5">
                        {fields.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLinkPage(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === linkPage
                                ? 'bg-primary-500 scale-125'
                                : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-content-secondary min-w-[3rem] text-center">
                        {linkPage + 1} / {fields.length}
                      </span>
                      <Button
                        type="text"
                        icon={<RightOutlined />}
                        disabled={linkPage >= fields.length - 1}
                        onClick={() =>
                          setLinkPage(p => Math.min(fields.length - 1, p + 1))
                        }
                        className="!px-2"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </Form.List>

          {/* 底部说明 */}
          <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <span className="text-base">💡</span>
            <div className="text-xs text-blue-700 leading-relaxed">
              <strong>数据来源</strong>：
              {LINK_ID_SOURCE_OPTIONS.map((opt, i) => (
                <span key={opt.value}>
                  {i > 0 && '，'}
                  <span className="text-blue-600">{opt.label}</span>{' '}
                  {opt.description}
                </span>
              ))}
            </div>
          </div>
        </div>
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
              <>
                编辑平台配置:{' '}
                <span className="text-primary-600">{config?.name}</span>
              </>
            )}
          </div>
          <div className="text-sm font-normal text-content-secondary mt-0.5">
            {isCreating ? (
              <>创建新的平台配置</>
            ) : (
              <>
                平台标识: {config?.platform} · 版本: v{config?.version || 1}
              </>
            )}
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
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
            <div className="flex justify-end gap-2 pt-4 border-t">{dom}</div>
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
