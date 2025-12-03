/**
 * 达人标签配置管理页面
 *
 * 版本: v2.0.0
 * 更新时间: 2025-12-02
 *
 * 功能说明：
 * - 管理达人重要程度等级配置
 * - 管理达人业务标签配置
 * - 支持自定义背景色和文字颜色
 * - 配置修改后立即生效
 *
 * v2.0 更新：
 * - 使用 ConfigurableItemList 组件重构
 * - 支持自定义颜色（bgColor + textColor）
 * - 简化交互，所见即所得
 */

import { useState, useCallback } from 'react';
import { ProCard } from '@ant-design/pro-components';
import { Button, Tabs, App, Spin } from 'antd';
import {
  ReloadOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useTagConfigs } from '../../hooks/useTagConfigs';
import type {
  TagConfigItem,
  TalentTagConfigs,
} from '../../types/customerTalent';
import { PageTransition } from '../../components/PageTransition';
import {
  ConfigurableItemList,
  type ConfigurableItem,
} from '../../components/ConfigurableItemList';

/**
 * TagConfigItem 转换为 ConfigurableItem
 */
function toConfigurableItem(item: TagConfigItem): ConfigurableItem {
  return {
    key: item.key,
    name: item.name,
    bgColor: item.bgColor || '#dbeafe',
    textColor: item.textColor || '#1e40af',
    sortOrder: item.sortOrder,
    description: item.description,
  };
}

/**
 * ConfigurableItem 转换为 TagConfigItem
 */
function toTagConfigItem(item: ConfigurableItem): TagConfigItem {
  return {
    key: item.key,
    name: item.name,
    bgColor: item.bgColor,
    textColor: item.textColor,
    sortOrder: item.sortOrder,
    description: item.description,
  };
}

export function TagManagement() {
  const { message } = App.useApp();

  const { configs, loading, error, saving, saveConfigs, refreshConfigs } =
    useTagConfigs();

  const [activeTab, setActiveTab] = useState<'importance' | 'business'>(
    'importance'
  );

  // 本地编辑状态
  const [localImportance, setLocalImportance] = useState<ConfigurableItem[]>(
    []
  );
  const [localBusiness, setLocalBusiness] = useState<ConfigurableItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 初始化本地状态（从 configs 同步）
  const syncFromConfigs = useCallback(() => {
    setLocalImportance(configs.importanceLevels.map(toConfigurableItem));
    setLocalBusiness(configs.businessTags.map(toConfigurableItem));
    setHasChanges(false);
  }, [configs]);

  // 首次加载或 configs 变化时同步
  if (
    !hasChanges &&
    localImportance.length === 0 &&
    configs.importanceLevels.length > 0
  ) {
    syncFromConfigs();
  }

  // 刷新配置
  const handleRefresh = async () => {
    await refreshConfigs();
    syncFromConfigs();
    message.success('配置已刷新');
  };

  // 重要程度变化
  const handleImportanceChange = (items: ConfigurableItem[]) => {
    setLocalImportance(items);
    setHasChanges(true);
  };

  // 业务标签变化
  const handleBusinessChange = (items: ConfigurableItem[]) => {
    setLocalBusiness(items);
    setHasChanges(true);
  };

  // 保存所有更改
  const handleSave = async () => {
    // 验证数据
    const importanceValid = localImportance.every(
      item => item.key && item.name
    );
    const businessValid = localBusiness.every(item => item.key && item.name);

    if (!importanceValid || !businessValid) {
      message.error('请填写完整的标识和名称');
      return;
    }

    // 检查 key 唯一性
    const importanceKeys = localImportance.map(item => item.key);
    const businessKeys = localBusiness.map(item => item.key);

    if (new Set(importanceKeys).size !== importanceKeys.length) {
      message.error('重要程度等级的标识不能重复');
      return;
    }

    if (new Set(businessKeys).size !== businessKeys.length) {
      message.error('业务标签的标识不能重复');
      return;
    }

    const newConfigs: TalentTagConfigs = {
      importanceLevels: localImportance.map(toTagConfigItem),
      businessTags: localBusiness.map(toTagConfigItem),
    };

    const success = await saveConfigs(newConfigs);
    if (success) {
      message.success('配置保存成功');
      setHasChanges(false);
    }
  };

  // 重置更改
  const handleReset = () => {
    syncFromConfigs();
    message.info('已重置为上次保存的配置');
  };

  const tabItems = [
    {
      key: 'importance',
      label: `重要程度 (${localImportance.length})`,
      children: (
        <ConfigurableItemList
          title="重要程度等级"
          description="用于标记达人的重要性，每个达人只能设置一个等级（单选）"
          items={localImportance}
          onChange={handleImportanceChange}
          addButtonText="新增等级"
          showDescription
          keyEditable={false}
          helpTip="建议按重要性从高到低排序，如：核心 → 重点 → 常规 → 备选 → 观察"
        />
      ),
    },
    {
      key: 'business',
      label: `业务标签 (${localBusiness.length})`,
      children: (
        <ConfigurableItemList
          title="业务标签"
          description="用于标记达人的业务属性，每个达人可以设置多个标签（多选）"
          items={localBusiness}
          onChange={handleBusinessChange}
          addButtonText="新增标签"
          showDescription={false}
          keyEditable={false}
          helpTip="业务标签可以根据实际业务需求自由定义，如：美妆专家、母婴达人、科技博主等"
        />
      ),
    },
  ];

  if (loading && configs.importanceLevels.length === 0) {
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
            <h1 className="text-2xl font-bold text-gray-900">达人标签配置</h1>
            <p className="mt-2 text-sm text-gray-600">
              管理达人重要程度等级和业务标签，标签配置全局生效
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && <Button onClick={handleReset}>重置</Button>}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges}
            >
              保存配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </div>
        </div>

        {/* 未保存提示 */}
        {hasChanges && (
          <ProCard className="bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <ExclamationCircleOutlined className="text-yellow-600 text-lg" />
              <span className="text-sm text-yellow-800">
                您有未保存的更改，请点击「保存配置」按钮保存
              </span>
            </div>
          </ProCard>
        )}

        {/* 说明卡片 */}
        <ProCard className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <ExclamationCircleOutlined className="text-blue-600 text-lg mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                标签使用说明
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>
                  <strong>重要程度</strong>
                  ：用于标记达人的重要性，每个达人只能设置一个重要程度等级（单选）
                </li>
                <li>
                  <strong>业务标签</strong>
                  ：用于标记达人的业务属性，每个达人可以设置多个业务标签（多选）
                </li>
                <li>
                  <strong>颜色配置</strong>
                  ：可自定义背景色和文字颜色，预览效果所见即所得
                </li>
                <li>标签配置修改后需点击「保存配置」才会生效</li>
              </ul>
            </div>
          </div>
        </ProCard>

        {/* 标签配置 Tabs */}
        <ProCard>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as 'importance' | 'business')}
            items={tabItems}
          />
        </ProCard>

        {/* 错误提示 */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
