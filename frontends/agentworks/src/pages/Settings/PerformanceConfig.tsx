/**
 * 达人表现配置管理页面（完整CRUD版本）
 * Phase 7: 支持完整的配置编辑功能
 */

import { useState } from 'react';
import { useFieldMapping } from '../../hooks/useFieldMapping';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { useDataImport } from '../../hooks/useDataImport';
import { FieldMappingManager } from '../../components/Performance/FieldMappingManager';
import { DimensionManager } from '../../components/Performance/DimensionManager';
import { DataImportModal } from '../../components/DataImportModal';
import { ImportResultPanel } from '../../components/ImportResultPanel';
import type { Platform } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';

export function PerformanceConfig() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [activeTab, setActiveTab] = useState<'mapping' | 'dimension' | 'import'>('mapping');
  const [showImportModal, setShowImportModal] = useState(false);

  const fieldMapping = useFieldMapping(selectedPlatform);
  const dimensionConfig = useDimensionConfig(selectedPlatform);
  const { importing, importResult, showResult, importFromFeishu, closeResult } = useDataImport(selectedPlatform);

  const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

  // 处理数据导入
  const handleImport = async (feishuUrl: string, priceYear: number, priceMonth: number) => {
    await importFromFeishu(feishuUrl, priceYear, priceMonth);
    setShowImportModal(false);
    // showResult 会自动变为 true，显示结果面板
  };

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
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'import'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            数据导入管理
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

        {activeTab === 'import' && (
          <DataImportPanel
            platform={selectedPlatform}
            onOpenImport={() => setShowImportModal(true)}
          />
        )}
      </div>

      {/* 数据导入弹窗 */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        platform={selectedPlatform}
        onImport={handleImport}
        loading={importing}
      />

      {/* 导入结果面板 */}
      {showResult && importResult && (
        <ImportResultPanel
          result={importResult}
          onClose={closeResult}
        />
      )}
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
        platform={platform}
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
        platform={platform}
        onAdd={dimensionConfig.addDimension}
        onUpdate={dimensionConfig.updateDimension}
        onDelete={dimensionConfig.deleteDimension}
        onReorder={dimensionConfig.reorderDimensions}
        onToggleVisibility={dimensionConfig.toggleDimensionVisibility}
      />
    </div>
  );
}

/**
 * 数据导入面板
 */
function DataImportPanel({
  platform,
  onOpenImport
}: {
  platform: Platform;
  onOpenImport: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* 导入说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          📥 数据导入功能说明
        </h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 支持从飞书表格导入 {PLATFORM_NAMES[platform]} 平台的达人表现数据</li>
          <li>• 导入前请确保字段映射配置已正确设置</li>
          <li>• 表格需要包含"达人UID"或"星图ID"列用于匹配达人</li>
          <li>• 导入后会自动更新达人的 performanceData 字段</li>
        </ul>
      </div>

      {/* 导入操作 */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              导入 {PLATFORM_NAMES[platform]} 表现数据
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              从飞书表格导入最新的达人表现数据，包括粉丝数、互动率、价格等指标
            </p>
            <button
              onClick={onOpenImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              + 开始导入
            </button>
          </div>
        </div>
      </div>

      {/* 导入步骤指南 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">导入步骤</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">1</span>
            <span>准备飞书表格，确保包含达人标识列（UID/星图ID）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">2</span>
            <span>在"字段映射配置"中检查字段映射规则是否正确</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">3</span>
            <span>点击"开始导入"按钮，粘贴飞书表格分享链接</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">4</span>
            <span>等待系统处理，导入完成后会显示结果统计</span>
          </li>
        </ol>
      </div>

      {/* 注意事项 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-900 mb-2">
          ⚠️ 注意事项
        </h3>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• 导入会覆盖原有的表现数据，请确认数据准确性</li>
          <li>• 建议在非高峰时段进行大批量数据导入</li>
          <li>• 如遇到导入失败，请检查飞书表格权限和字段映射</li>
        </ul>
      </div>
    </div>
  );
}
