/**
 * 达人近期表现主页面
 */

import { useState, useCallback } from 'react';
import type { Platform, PriceType } from '../../types/talent';
import { PLATFORM_NAMES, PLATFORM_PRICE_TYPES } from '../../types/talent';  // PLATFORM_PRICE_TYPES used in handlePlatformChange
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { usePerformanceFilters } from '../../hooks/usePerformanceFilters';
import { PerformanceTable } from './PerformanceTable';
import { PerformanceFilters } from '../../components/Performance/PerformanceFilters';
import { Pagination } from '../../components/Pagination';

export function PerformanceHome() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('douyin');
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType | null>('video_60plus');

  const { talents, loading, total, currentPage, pageSize, totalPages, setPage, search } =
    usePerformanceData(selectedPlatform);

  const { activeConfig, visibleDimensionIds, loading: configLoading } =
    useDimensionConfig(selectedPlatform);

  // 筛选 Hook - 从维度配置中提取可筛选维度
  const {
    filterableDimensions,
    filtersByCategory,
    filters,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    resetFilters,
    buildQueryParams
  } = usePerformanceFilters(activeConfig?.dimensions || []);

  // 执行搜索
  const handleSearch = useCallback(() => {
    const queryParams = buildQueryParams();
    search(queryParams);
  }, [buildQueryParams, search]);

  // 重置筛选并搜索
  const handleReset = useCallback(() => {
    resetFilters();
    search({});
  }, [resetFilters, search]);

  const platforms: Platform[] = ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou'];

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
    <div className="space-y-4">
      {/* 页面标题行 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">近期表现</h1>
        <p className="text-gray-600 mt-1 text-sm">查看各平台达人的表现数据</p>
      </div>

      {/* 平台 Tabs（达人数量显示在Tab中） */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1">
          {platforms.map(platform => (
            <button
              key={platform}
              onClick={() => handlePlatformChange(platform)}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                selectedPlatform === platform
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {PLATFORM_NAMES[platform]}
              {selectedPlatform === platform && total > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {total}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 筛选面板 */}
      {!configLoading && filterableDimensions.length > 0 && (
        <PerformanceFilters
          filterableDimensions={filterableDimensions}
          filtersByCategory={filtersByCategory}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onFilterChange={updateFilter}
          onReset={handleReset}
          onSearch={handleSearch}
        />
      )}

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
            onPriceTypeChange={setSelectedPriceType}
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
