/**
 * 达人近期表现主页面
 */

import { useState } from 'react';
import type { Platform, PriceType } from '../../types/talent';
import { PLATFORM_NAMES, PLATFORM_PRICE_TYPES } from '../../types/talent';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { PerformanceTable } from './PerformanceTable';
import { Pagination } from '../../components/Pagination';

export function PerformanceHome() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType | null>('video_60plus');

  const { talents, loading, total, currentPage, pageSize, totalPages, setPage } =
    usePerformanceData(selectedPlatform);

  const { activeConfig, visibleDimensionIds, loading: configLoading } =
    useDimensionConfig(selectedPlatform);

  const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

  // 获取当前平台的价格类型配置
  const priceTypes = PLATFORM_PRICE_TYPES[selectedPlatform] || [];

  // 处理平台切换
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setPage(1);  // 重置到第一页

    // 切换平台时，重置价格类型为该平台的第一个
    const newPlatformPriceTypes = PLATFORM_PRICE_TYPES[platform];
    if (newPlatformPriceTypes && newPlatformPriceTypes.length > 0) {
      setSelectedPriceType(newPlatformPriceTypes[0].key);
    } else {
      setSelectedPriceType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">近期表现</h1>
          <p className="text-gray-600 mt-2">查看各平台达人的表现数据</p>
        </div>
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

      {/* 价格类型选择器 */}
      {priceTypes.length > 0 && (
        <div className="flex items-center gap-3 bg-purple-50 px-4 py-3 rounded-lg border border-purple-200">
          <label className="text-sm font-medium text-purple-900">
            💰 显示价格类型:
          </label>
          <select
            value={selectedPriceType || ''}
            onChange={(e) => setSelectedPriceType(e.target.value as PriceType || null)}
            className="px-3 py-1.5 text-sm border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">不显示价格</option>
            {priceTypes.map(pt => (
              <option key={pt.key} value={pt.key}>
                {pt.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-purple-700">
            （显示最新月份的价格）
          </span>
        </div>
      )}

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
            selectedPriceType={selectedPriceType}
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
    </div>
  );
}
