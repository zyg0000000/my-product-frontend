/**
 * 达人表现数据表格（配置驱动）
 * 完全基于维度配置动态渲染，支持所有平台复用
 * Phase 9: 支持固定列（sticky）+ 横向滚动 + 列排序
 * Phase 10: 价格列头内置选择器
 */

import { useState, useRef, useEffect } from 'react';
import type { Talent, PriceType } from '../../types/talent';
import { PLATFORM_PRICE_TYPES } from '../../types/talent';
import type { DimensionConfig } from '../../api/performance';
import { formatPrice } from '../../utils/formatters';

type SortDirection = 'asc' | 'desc' | null;

/**
 * 获取指定类型的最新价格
 */
function getLatestPrice(talent: Talent, priceType: PriceType): number | null {
  const prices = talent.prices || [];

  // 筛选该类型的所有价格
  const typePrices = prices.filter(p => p.type === priceType);

  if (typePrices.length === 0) return null;

  // 按年月降序排序，取最新的
  typePrices.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return typePrices[0].price;  // 返回价格（分）
}

/**
 * 获取平台达人的外链（星图、蒲公英等）
 */
function getPlatformLink(talent: Talent): string | null {
  if (talent.platform === 'douyin') {
    // 抖音：使用星图ID或platformAccountId
    const xingtuId = talent.platformSpecific?.xingtuId || talent.platformAccountId;
    if (!xingtuId) return null;
    return `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${xingtuId}`;
  }
  // 其他平台后续添加
  // xiaohongshu: 蒲公英
  // bilibili: 花火
  // kuaishou: 磁力聚星
  return null;
}

/**
 * 获取价格维度的动态表头名称
 */
function getPriceDimensionName(dimension: DimensionConfig, selectedPriceType: PriceType | null | undefined, platform: string): string {
  if (dimension.type !== 'price') return dimension.name;

  const priceType = dimension.priceType || selectedPriceType;
  if (!priceType) return dimension.name;

  // 获取价格类型的标签
  const allPriceTypes = PLATFORM_PRICE_TYPES[platform as keyof typeof PLATFORM_PRICE_TYPES] || [];
  const priceTypeConfig = allPriceTypes.find(pt => pt.key === priceType);

  return priceTypeConfig ? `${priceTypeConfig.label}报价` : dimension.name;
}

interface PerformanceTableProps {
  talents: Talent[];
  dimensions: DimensionConfig[];
  visibleDimensionIds: string[];
  loading?: boolean;
  selectedPriceType?: PriceType | null | undefined;
  onPriceTypeChange?: (priceType: PriceType | null) => void;  // 新增：价格类型变更回调
}

export function PerformanceTable({
  talents,
  dimensions,
  visibleDimensionIds,
  loading,
  selectedPriceType,
  onPriceTypeChange
}: PerformanceTableProps) {
  // 获取当前平台（从第一个达人获取）
  const platform = talents.length > 0 ? talents[0].platform : 'douyin';
  // 排序状态
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  // 价格列头下拉状态
  const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
  const priceDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
        setPriceDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取显示的维度（按 order 排序）
  let visibleDimensions = dimensions
    .filter(dim => visibleDimensionIds.includes(dim.id))
    .sort((a, b) => a.order - b.order);

  // 如果选择"不显示价格"，过滤掉所有 price 类型的维度
  if (!selectedPriceType) {
    visibleDimensions = visibleDimensions.filter(dim => dim.type !== 'price');
  }

  // 分离固定列和滚动列
  const pinnedDimensions = visibleDimensions.filter(dim => dim.pinned);
  const scrollableDimensions = visibleDimensions.filter(dim => !dim.pinned);

  // 处理列头点击排序
  const handleSort = (dimension: DimensionConfig) => {
    if (!dimension.sortable) return;

    if (sortColumn === dimension.id) {
      // 同一列：切换排序方向 (升序 → 降序 → 无排序)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      // 新列：设置为升序
      setSortColumn(dimension.id);
      setSortDirection('asc');
    }
  };

  // 排序数据
  const sortedTalents = [...talents].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const dimension = visibleDimensions.find(d => d.id === sortColumn);
    if (!dimension) return 0;

    const aValue = getNestedValue(a, dimension.targetPath);
    const bValue = getNestedValue(b, dimension.targetPath);

    // 处理 null/undefined
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // 根据类型排序
    let comparison = 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (talents.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无数据</div>;
  }

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="text-xs" style={{ minWidth: '100%', width: 'max-content', tableLayout: 'fixed' }}>
        <thead className="bg-gray-50">
          <tr>
            {/* 固定列表头 */}
            {pinnedDimensions.map((dim, index) => {
              // 计算left位置：累加前面所有列的宽度
              let leftPosition = 0;
              for (let i = 0; i < index; i++) {
                leftPosition += (pinnedDimensions[i].width || 120);
              }

              const isPriceColumn = dim.type === 'price';

              return (
                <th
                  key={dim.id}
                  onClick={!isPriceColumn ? () => handleSort(dim) : undefined}
                  className={`sticky bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-700 border-r-2 border-gray-300 whitespace-nowrap ${
                    !isPriceColumn && dim.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{
                    left: `${leftPosition}px`,
                    width: `${dim.width || 120}px`,
                    minWidth: `${dim.width || 120}px`,
                    zIndex: 20
                  }}
                >
                  {isPriceColumn ? (
                    <PriceColumnHeader
                      platform={platform}
                      selectedPriceType={selectedPriceType}
                      onPriceTypeChange={onPriceTypeChange}
                      isOpen={priceDropdownOpen}
                      onToggle={() => setPriceDropdownOpen(!priceDropdownOpen)}
                      dropdownRef={priceDropdownRef}
                      sortable={dim.sortable}
                      onSort={() => handleSort(dim)}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {dim.name}
                      {dim.sortable && <SortIcon columnId={dim.id} sortColumn={sortColumn} sortDirection={sortDirection} />}
                    </div>
                  )}
                </th>
              );
            })}
            {/* 可滚动列表头 */}
            {scrollableDimensions.map(dim => {
              const isPriceColumn = dim.type === 'price';

              return (
                <th
                  key={dim.id}
                  onClick={!isPriceColumn ? () => handleSort(dim) : undefined}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-700 whitespace-nowrap ${
                    !isPriceColumn && dim.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{
                    width: `${dim.width || 120}px`,
                    minWidth: `${dim.width || 120}px`
                  }}
                >
                  {isPriceColumn ? (
                    <PriceColumnHeader
                      platform={platform}
                      selectedPriceType={selectedPriceType}
                      onPriceTypeChange={onPriceTypeChange}
                      isOpen={priceDropdownOpen}
                      onToggle={() => setPriceDropdownOpen(!priceDropdownOpen)}
                      dropdownRef={priceDropdownRef}
                      sortable={dim.sortable}
                      onSort={() => handleSort(dim)}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {getPriceDimensionName(dim, selectedPriceType, platform)}
                      {dim.sortable && <SortIcon columnId={dim.id} sortColumn={sortColumn} sortDirection={sortDirection} />}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedTalents.map((talent, index) => (
            <tr key={talent.oneId || index} className="border-t hover:bg-gray-50">
              {/* 固定列单元格 */}
              {pinnedDimensions.map((dim, colIndex) => {
                // 计算left位置：累加前面所有列的宽度
                let leftPosition = 0;
                for (let i = 0; i < colIndex; i++) {
                  leftPosition += (pinnedDimensions[i].width || 120);
                }

                return (
                  <td
                    key={dim.id}
                    className="sticky bg-white px-4 py-3 border-r-2 border-gray-300 whitespace-nowrap text-xs"
                    style={{
                      left: `${leftPosition}px`,
                      width: `${dim.width || 120}px`,
                      minWidth: `${dim.width || 120}px`,
                      zIndex: 10
                    }}
                  >
                    {renderCellContent(talent, dim, selectedPriceType)}
                  </td>
                );
              })}
              {/* 可滚动列单元格 */}
              {scrollableDimensions.map(dim => (
                <td
                  key={dim.id}
                  className="px-4 py-3 whitespace-nowrap text-xs"
                  style={{
                    width: `${dim.width || 120}px`,
                    minWidth: `${dim.width || 120}px`
                  }}
                >
                  {renderCellContent(talent, dim, selectedPriceType)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 渲染单元格内容（支持达人名称链接 + 价格类型）
 */
function renderCellContent(talent: Talent, dimension: DimensionConfig, selectedPriceType?: PriceType | null): React.ReactNode {
  // 如果是达人名称列（targetPath 为 'name'），渲染为可点击链接
  if (dimension.targetPath === 'name') {
    const platformLink = getPlatformLink(talent);
    const name = talent.name || 'N/A';

    if (platformLink) {
      return (
        <a
          href={platformLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      );
    } else {
      return <span className="font-medium text-gray-900">{name}</span>;
    }
  }

  // 其他列使用格式化函数
  return formatCellValue(talent, dimension, selectedPriceType);
}

/**
 * 根据维度配置格式化单元格值
 */
function formatCellValue(talent: Talent, dimension: DimensionConfig, selectedPriceType?: PriceType | null): string {
  // 🔥 特殊处理：price 类型
  if (dimension.type === 'price') {
    // 优先使用维度配置中的 priceType，其次使用全局选择的
    const priceType = dimension.priceType || selectedPriceType;

    if (!priceType) {
      return 'N/A';
    }

    const latestPrice = getLatestPrice(talent, priceType as PriceType);
    return latestPrice ? formatPrice(latestPrice) : 'N/A';
  }

  // 普通字段处理
  const value = getNestedValue(talent, dimension.targetPath);

  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (dimension.type) {
    case 'percentage':
      return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'N/A';
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('zh-CN');
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString('zh-CN');
      }
      return String(value);
    case 'text':
    default:
      return String(value);
  }
}

/**
 * 获取嵌套属性值
 * 支持路径如: 'name', 'performanceData.cpm', 'performanceData.audienceGender.male'
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[key];
  }

  return current;
}

/**
 * 排序图标组件
 */
function SortIcon({
  columnId,
  sortColumn,
  sortDirection
}: {
  columnId: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
}) {
  const isActive = sortColumn === columnId;

  if (!isActive) {
    // 未激活：显示灰色双箭头
    return (
      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  if (sortDirection === 'asc') {
    // 升序：向上箭头
    return (
      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }

  // 降序：向下箭头
  return (
    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * 价格列头选择器组件
 */
function PriceColumnHeader({
  platform,
  selectedPriceType,
  onPriceTypeChange,
  isOpen,
  onToggle,
  dropdownRef,
  sortable,
  onSort,
  sortColumn,
  sortDirection
}: {
  platform: string;
  selectedPriceType: PriceType | null | undefined;
  onPriceTypeChange?: (priceType: PriceType | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  sortable?: boolean;
  onSort?: () => void;
  sortColumn: string | null;
  sortDirection: SortDirection;
}) {
  const priceTypes = PLATFORM_PRICE_TYPES[platform as keyof typeof PLATFORM_PRICE_TYPES] || [];
  const currentLabel = selectedPriceType
    ? priceTypes.find(pt => pt.key === selectedPriceType)?.label || '报价'
    : '报价';

  const handleSelect = (priceType: PriceType | null) => {
    onPriceTypeChange?.(priceType);
    onToggle();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex items-center gap-1">
        {/* 价格类型选择按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <span>{currentLabel}报价</span>
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {/* 排序图标 */}
        {sortable && (
          <button onClick={onSort} className="ml-1">
            <SortIcon columnId="price" sortColumn={sortColumn} sortDirection={sortDirection} />
          </button>
        )}
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[100px]">
          {priceTypes.map(pt => (
            <button
              key={pt.key}
              onClick={() => handleSelect(pt.key)}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                selectedPriceType === pt.key ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              {selectedPriceType === pt.key && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span>{pt.label}</span>
            </button>
          ))}
          <div className="border-t border-gray-100">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                !selectedPriceType ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
              }`}
            >
              {!selectedPriceType && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span>隐藏</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
