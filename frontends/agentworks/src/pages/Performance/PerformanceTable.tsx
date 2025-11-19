/**
 * 达人表现数据表格（配置驱动）
 * 完全基于维度配置动态渲染，支持所有平台复用
 */

import type { Talent } from '../../types/talent';
import type { DimensionConfig } from '../../api/performance';

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
  // 获取显示的维度（按 order 排序）
  const visibleDimensions = dimensions
    .filter(dim => visibleDimensionIds.includes(dim.id))
    .sort((a, b) => a.order - b.order);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (talents.length === 0) {
    return <div className="p-8 text-center text-gray-500">暂无数据</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {visibleDimensions.map(dim => (
              <th
                key={dim.id}
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase"
                style={{ width: dim.width || 120 }}
              >
                {dim.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {talents.map((talent, index) => (
            <tr key={talent.oneId || index} className="border-t hover:bg-gray-50">
              {visibleDimensions.map(dim => (
                <td key={dim.id} className="px-4 py-3">
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
