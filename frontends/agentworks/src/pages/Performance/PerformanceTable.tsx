/**
 * 达人表现数据表格（配置驱动）
 * 完全基于维度配置动态渲染，支持所有平台复用
 * Phase 9: 支持固定列（sticky）+ 横向滚动 + 列排序
 */

import { useState } from 'react';
import type { Talent } from '../../types/talent';
import type { DimensionConfig } from '../../api/performance';

type SortDirection = 'asc' | 'desc' | null;

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

interface PerformanceTableProps {
  talents: Talent[];
  dimensions: DimensionConfig[];
  visibleDimensionIds: string[];
  loading?: boolean;
}

export function PerformanceTable({
  talents,
  dimensions,
  visibleDimensionIds,
  loading
}: PerformanceTableProps) {
  // 排序状态
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // 获取显示的维度（按 order 排序）
  const visibleDimensions = dimensions
    .filter(dim => visibleDimensionIds.includes(dim.id))
    .sort((a, b) => a.order - b.order);

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

              return (
                <th
                  key={dim.id}
                  onClick={() => handleSort(dim)}
                  className={`sticky bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase border-r-2 border-gray-300 whitespace-nowrap ${
                    dim.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{
                    left: `${leftPosition}px`,
                    width: `${dim.width || 120}px`,
                    minWidth: `${dim.width || 120}px`,
                    zIndex: 20
                  }}
                >
                  <div className="flex items-center gap-1">
                    {dim.name}
                    {dim.sortable && <SortIcon columnId={dim.id} sortColumn={sortColumn} sortDirection={sortDirection} />}
                  </div>
                </th>
              );
            })}
            {/* 可滚动列表头 */}
            {scrollableDimensions.map(dim => (
              <th
                key={dim.id}
                onClick={() => handleSort(dim)}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap ${
                  dim.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{
                  width: `${dim.width || 120}px`,
                  minWidth: `${dim.width || 120}px`
                }}
              >
                <div className="flex items-center gap-1">
                  {dim.name}
                  {dim.sortable && <SortIcon columnId={dim.id} sortColumn={sortColumn} sortDirection={sortDirection} />}
                </div>
              </th>
            ))}
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
                    {renderCellContent(talent, dim)}
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
                  {renderCellContent(talent, dim)}
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
 * 渲染单元格内容（支持达人名称链接）
 */
function renderCellContent(talent: Talent, dimension: DimensionConfig): React.ReactNode {
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
  return formatCellValue(talent, dimension);
}

/**
 * 根据维度配置格式化单元格值
 */
function formatCellValue(talent: Talent, dimension: DimensionConfig): string {
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
