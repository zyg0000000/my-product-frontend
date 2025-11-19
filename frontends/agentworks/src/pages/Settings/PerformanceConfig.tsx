/**
 * 达人表现配置管理页面（简化版）
 * Phase 3 核心功能：查看和管理字段映射、维度配置
 */

import { useState } from 'react';
import { useFieldMapping } from '../../hooks/useFieldMapping';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
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
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'mapping' && (
          <MappingConfigPanel
            platform={selectedPlatform}
            config={fieldMapping.activeConfig}
            loading={fieldMapping.loading}
            onReload={fieldMapping.loadConfigs}
          />
        )}

        {activeTab === 'dimension' && (
          <DimensionConfigPanel
            platform={selectedPlatform}
            config={dimensionConfig.activeConfig}
            loading={dimensionConfig.loading}
            onReload={dimensionConfig.loadConfigs}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 字段映射配置面板（简化版）
 */
function MappingConfigPanel({
  platform,
  config,
  loading,
  onReload
}: {
  platform: Platform;
  config: any;
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">未找到 {PLATFORM_NAMES[platform]} 的配置</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          创建默认配置
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">
            {config.configName} (v{config.version})
          </h3>
          <p className="text-sm text-gray-500">{config.description}</p>
        </div>
        <button
          onClick={onReload}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          刷新
        </button>
      </div>

      {/* 映射规则列表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Excel列名</th>
              <th className="px-4 py-2 text-left">目标字段路径</th>
              <th className="px-4 py-2 text-left">格式</th>
              <th className="px-4 py-2 text-center">必需</th>
            </tr>
          </thead>
          <tbody>
            {config.mappings.map((rule: any, index: number) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                <td className="px-4 py-2 font-medium">{rule.excelHeader}</td>
                <td className="px-4 py-2 text-gray-600 font-mono text-xs">{rule.targetPath}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    rule.format === 'percentage' ? 'bg-purple-100 text-purple-700' :
                    rule.format === 'number' ? 'bg-green-100 text-green-700' :
                    rule.format === 'date' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {rule.format}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {rule.required ? '✅' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        总计 {config.totalMappings || config.mappings.length} 个映射规则
      </div>
    </div>
  );
}

/**
 * 维度配置面板（简化版）
 */
function DimensionConfigPanel({
  platform,
  config,
  loading,
  onReload
}: {
  platform: Platform;
  config: any;
  loading: boolean;
  onReload: () => void;
}) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">未找到 {PLATFORM_NAMES[platform]} 的配置</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          创建默认配置
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">
            {config.configName} (v{config.version})
          </h3>
          <p className="text-sm text-gray-500">
            共 {config.totalDimensions} 个维度，默认显示 {config.defaultVisibleIds?.length || 0} 个
          </p>
        </div>
        <button
          onClick={onReload}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          刷新
        </button>
      </div>

      {/* 维度列表（表格形式）*/}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">维度名称</th>
              <th className="px-4 py-2 text-left">分类</th>
              <th className="px-4 py-2 text-left">目标字段路径</th>
              <th className="px-4 py-2 text-left">类型</th>
              <th className="px-4 py-2 text-center">默认显示</th>
              <th className="px-4 py-2 text-center">可排序</th>
              <th className="px-4 py-2 text-center">列宽</th>
            </tr>
          </thead>
          <tbody>
            {config.dimensions
              .sort((a: any, b: any) => a.order - b.order)
              .map((dim: any, index: number) => (
                <tr key={dim.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-2 font-medium">{dim.name}</td>
                  <td className="px-4 py-2 text-gray-600">{dim.category}</td>
                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{dim.targetPath}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      dim.type === 'percentage' ? 'bg-purple-100 text-purple-700' :
                      dim.type === 'number' ? 'bg-green-100 text-green-700' :
                      dim.type === 'date' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dim.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {dim.defaultVisible ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {dim.sortable ? (
                      <span className="text-blue-600">✓</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600">{dim.width}px</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div>总计 {config.totalDimensions || config.dimensions.length} 个维度</div>
        <div>
          默认显示:
          {config.dimensions.filter((d: any) => d.defaultVisible).map((d: any) => (
            <span key={d.id} className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {d.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
