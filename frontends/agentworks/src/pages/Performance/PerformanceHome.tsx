/**
 * 达人近期表现主页面
 */

import { useState } from 'react';
import type { Platform } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { useDataImport } from '../../hooks/useDataImport';
import { PerformanceTable } from './PerformanceTable';
import { Pagination } from '../../components/Pagination';
import { DataImportModal } from '../../components/DataImportModal';

export function PerformanceHome() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [showImportModal, setShowImportModal] = useState(false);

  const { talents, loading, total, currentPage, pageSize, totalPages, setPage, reload } =
    usePerformanceData(selectedPlatform);

  const { activeConfig, visibleDimensionIds, loading: configLoading } =
    useDimensionConfig(selectedPlatform);

  const { importing, importFromFeishu } = useDataImport(selectedPlatform);

  const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

  // 处理平台切换
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setPage(1);  // 重置到第一页
  };

  // 处理数据导入
  const handleImport = async (feishuUrl: string) => {
    await importFromFeishu(feishuUrl);
    reload();  // 导入成功后刷新列表
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">达人近期表现</h1>
          <p className="text-gray-600 mt-2">查看和管理各平台达人的表现数据</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + 导入数据
        </button>
      </div>

      {/* 平台 Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => handlePlatformChange(platform)}
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">总达人数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">当前页</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {currentPage} / {totalPages}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">显示维度</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {visibleDimensionIds.length} / {activeConfig?.dimensions.length || 0}
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="bg-white rounded-lg shadow">
        {configLoading || loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : activeConfig ? (
          <PerformanceTable
            talents={talents}
            dimensions={activeConfig.dimensions}
            visibleDimensionIds={visibleDimensionIds}
            loading={loading}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            未找到 {PLATFORM_NAMES[selectedPlatform]} 的配置
          </div>
        )}

        {/* 分页 */}
        {totalPages > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
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
    </div>
  );
}
