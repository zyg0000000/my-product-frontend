/**
 * 达人表现配置管理页面（完整CRUD版本）
 * Phase 7: 支持完整的配置编辑功能
 */

import { useState } from 'react';
import { useFieldMapping } from '../../hooks/useFieldMapping';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { FieldMappingManager } from '../../components/Performance/FieldMappingManager';
import { DimensionManager } from '../../components/Performance/DimensionManager';
import type { Platform } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';

export function PerformanceConfig() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [activeTab, setActiveTab] = useState<'mapping' | 'dimension'>('mapping');

  const fieldMapping = useFieldMapping(selectedPlatform);
  const dimensionConfig = useDimensionConfig(selectedPlatform);

  const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">达人表现配置管理</h1>
          <p className="text-gray-600 mt-2">管理各平台的字段映射和数据维度配置</p>
        </div>
      </div>

      {/* 平台 Tabs（与基础信息一致）*/}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedPlatform === platform
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {PLATFORM_NAMES[platform]}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 切换（二级Tab）*/}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('mapping')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'mapping'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            字段映射配置
          </button>
          <button
            onClick={() => setActiveTab('dimension')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'dimension'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            数据维度配置
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'mapping' && (
          <MappingConfigPanel
            platform={selectedPlatform}
            fieldMapping={fieldMapping}
          />
        )}

        {activeTab === 'dimension' && (
          <DimensionConfigPanel
            platform={selectedPlatform}
            dimensionConfig={dimensionConfig}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 字段映射配置面板（完整CRUD版本）
 */
function MappingConfigPanel({
  platform,
  fieldMapping
}: {
  platform: Platform;
  fieldMapping: ReturnType<typeof useFieldMapping>;
}) {
  if (fieldMapping.loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!fieldMapping.activeConfig) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">未找到 {PLATFORM_NAMES[platform]} 的配置</p>
        <button
          onClick={() => {
            // 创建默认配置的逻辑可以在这里添加
            alert('创建默认配置功能待实现');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          创建默认配置
        </button>
      </div>
    );
  }

  const config = fieldMapping.activeConfig;

  return (
    <div className="space-y-4">
      {/* 配置信息 */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {config.configName} (v{config.version})
          </h3>
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        </div>
        <button
          onClick={fieldMapping.loadConfigs}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </div>

      {/* 字段映射管理器 */}
      <FieldMappingManager
        mappings={config.mappings}
        onAdd={fieldMapping.addMappingRule}
        onUpdate={fieldMapping.updateMappingRule}
        onDelete={fieldMapping.deleteMappingRule}
      />
    </div>
  );
}

/**
 * 维度配置面板（完整CRUD版本 + 拖拽排序）
 */
function DimensionConfigPanel({
  platform,
  dimensionConfig
}: {
  platform: Platform;
  dimensionConfig: ReturnType<typeof useDimensionConfig>;
}) {
  if (dimensionConfig.loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!dimensionConfig.activeConfig) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">未找到 {PLATFORM_NAMES[platform]} 的配置</p>
        <button
          onClick={() => {
            // 创建默认配置的逻辑可以在这里添加
            alert('创建默认配置功能待实现');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          创建默认配置
        </button>
      </div>
    );
  }

  const config = dimensionConfig.activeConfig;

  return (
    <div className="space-y-4">
      {/* 配置信息 */}
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {config.configName} (v{config.version || '1.0'})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {PLATFORM_NAMES[platform]}达人表现数据维度配置（基于ByteProject performance页面）
          </p>
        </div>
        <button
          onClick={dimensionConfig.loadConfigs}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </div>

      {/* 维度管理器 */}
      <DimensionManager
        dimensions={config.dimensions}
        onAdd={dimensionConfig.addDimension}
        onUpdate={dimensionConfig.updateDimension}
        onDelete={dimensionConfig.deleteDimension}
        onReorder={dimensionConfig.reorderDimensions}
        onToggleVisibility={dimensionConfig.toggleDimensionVisibility}
      />
    </div>
  );
}
