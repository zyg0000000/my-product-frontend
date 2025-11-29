/**
 * 达人近期表现主页面 - Ant Design Pro + Tailwind 版本
 * v2.0: 使用 ProTable 替代手写表格
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable, ProCard } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Select, Button, Tabs, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { Platform, PriceType, Talent } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useDimensionConfig } from '../../hooks/useDimensionConfig';
import { usePerformanceFilters } from '../../hooks/usePerformanceFilters';
import { PerformanceFilters } from '../../components/Performance/PerformanceFilters';
import { formatPrice } from '../../utils/formatters';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { TableSkeleton } from '../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../components/PageTransition';

/**
 * 获取指定类型的最新价格
 */
function getLatestPrice(talent: Talent, priceType: PriceType): number | null {
  const prices = talent.prices || [];
  const typePrices = prices.filter(p => p.type === priceType);
  if (typePrices.length === 0) return null;

  typePrices.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return typePrices[0].price;
}

/**
 * 获取嵌套属性值
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  return current;
}

/**
 * 获取平台达人的外链
 */
function getPlatformLink(talent: Talent): string | null {
  if (talent.platform === 'douyin') {
    if (!talent.platformAccountId) return null;
    return `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${talent.platformAccountId}`;
  }
  return null;
}

export function PerformanceHome() {
  const navigate = useNavigate();

  // 使用平台配置 Hook（只获取启用的平台）
  const {
    getPlatformList,
    getPlatformPriceTypes,
    loading: configLoadingPlatform,
  } = usePlatformConfig(false);
  const platforms = getPlatformList();

  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    platforms[0] || 'douyin'
  );
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType | null>(
    'video_60plus'
  );
  const actionRef = useRef<ActionType>(null);

  const { talents, loading, total, currentPage, pageSize, setPage, search } =
    usePerformanceData(selectedPlatform);

  const {
    activeConfig,
    visibleDimensionIds,
    loading: configLoading,
  } = useDimensionConfig(selectedPlatform);

  // 筛选 Hook - 从维度配置中提取可筛选维度
  const {
    filterableDimensions,
    filtersByCategory,
    filters,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    resetFilters,
    buildQueryParams,
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

  // 使用动态配置获取价格类型
  const priceTypes = getPlatformPriceTypes(selectedPlatform);

  // 处理平台切换
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    setPage(1);
    const newPlatformPriceTypes = getPlatformPriceTypes(platform);
    if (newPlatformPriceTypes && newPlatformPriceTypes.length > 0) {
      setSelectedPriceType(newPlatformPriceTypes[0].key as PriceType);
    } else {
      setSelectedPriceType(null);
    }
  };

  // 动态生成 ProTable columns
  const columns: ProColumns<Talent>[] = useMemo(() => {
    if (!activeConfig) return [];

    // 获取可见的维度
    let visibleDimensions = activeConfig.dimensions
      .filter(dim => visibleDimensionIds.includes(dim.id))
      .sort((a, b) => a.order - b.order);

    // 如果选择"不显示价格"，过滤掉 price 类型
    if (!selectedPriceType) {
      visibleDimensions = visibleDimensions.filter(dim => dim.type !== 'price');
    }

    return visibleDimensions.map(dim => {
      // 特殊处理：更新日期固定到右侧
      const isUpdateDate =
        dim.targetPath === 'performanceData.updateDate' ||
        dim.targetPath === 'updatedAt' ||
        dim.name.includes('更新日期');

      const column: ProColumns<Talent> = {
        title: dim.name,
        dataIndex: dim.targetPath.split('.'),
        key: dim.id,
        width: dim.width || 120,
        fixed: isUpdateDate ? 'right' : dim.pinned ? 'left' : undefined,
        ellipsis: true,
        hideInSearch: true, // 筛选器独立，不使用 ProTable 内置搜索
      };

      // 特殊处理：达人名称（带链接）
      if (dim.targetPath === 'name') {
        column.render = (_, record) => {
          const platformLink = getPlatformLink(record);
          const name = record.name || 'N/A';

          if (platformLink) {
            return (
              <a
                href={platformLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
              >
                {name}
              </a>
            );
          }
          return <span className="font-medium text-gray-900">{name}</span>;
        };
      }

      // 特殊处理：价格类型
      if (dim.type === 'price') {
        column.title = selectedPriceType
          ? priceTypes.find(pt => pt.key === selectedPriceType)?.label + '报价'
          : '报价';

        column.render = (_, record) => {
          if (!selectedPriceType) return 'N/A';
          const price = getLatestPrice(record, selectedPriceType);
          return price ? formatPrice(price) : 'N/A';
        };
      }

      // 特殊处理：百分比
      if (dim.type === 'percentage') {
        column.render = (_, record) => {
          const value = getNestedValue(record, dim.targetPath);
          return value !== null && value !== undefined
            ? `${(value * 100).toFixed(1)}%`
            : 'N/A';
        };
      }

      // 特殊处理：数字
      if (dim.type === 'number') {
        column.render = (_, record) => {
          const value = getNestedValue(record, dim.targetPath);
          return value !== null && value !== undefined
            ? typeof value === 'number'
              ? value.toLocaleString()
              : String(value)
            : 'N/A';
        };
      }

      // 特殊处理：日期（显示为 YYYY-MM-DD）
      if (dim.type === 'date') {
        column.render = (_, record) => {
          const value = getNestedValue(record, dim.targetPath);
          if (!value) return 'N/A';

          // 如果已经是 YYYY-MM-DD 格式的字符串，直接显示
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
          }

          try {
            const date = value instanceof Date ? value : new Date(value);
            if (isNaN(date.getTime())) return 'N/A';

            // 格式化为 YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
          } catch {
            return 'N/A';
          }
        };
      }

      // 排序支持
      if (dim.sortable) {
        column.sorter = (a, b) => {
          const aValue = getNestedValue(a, dim.targetPath);
          const bValue = getNestedValue(b, dim.targetPath);

          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;

          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return aValue - bValue;
          }
          return String(aValue).localeCompare(String(bValue));
        };
      }

      return column;
    });
  }, [activeConfig, visibleDimensionIds, selectedPriceType, priceTypes]);

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* 页面标题 - Tailwind */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">近期表现</h1>
          <p className="text-gray-600 mt-1 text-sm">查看各平台达人的表现数据</p>
        </div>

        {/* 平台 Tabs - Ant Design Tabs */}
        <Tabs
          activeKey={selectedPlatform}
          onChange={key => handlePlatformChange(key as Platform)}
          items={platforms.map(platform => ({
            key: platform,
            label: PLATFORM_NAMES[platform],
          }))}
        />

        {/* 筛选面板 */}
        {!configLoading && filterableDimensions.length > 0 && (
          <ProCard bodyStyle={{ padding: 16 }}>
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
          </ProCard>
        )}

        {/* ProTable - 新版实现 */}
        {(configLoadingPlatform || configLoading || loading) &&
        talents.length === 0 ? (
          <TableSkeleton columnCount={8} rowCount={10} />
        ) : (
          <ProTable<Talent>
            columns={columns}
            actionRef={actionRef}
            dataSource={talents}
            rowKey="oneId"
            loading={configLoadingPlatform || configLoading || loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条`,
              onChange: page => setPage(page),
            }}
            search={false} // 关闭 ProTable 内置搜索
            cardBordered
            headerTitle={
              <div className="flex items-center gap-3">
                <span className="font-medium">近期表现</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">共 {total} 个达人</span>
              </div>
            }
            toolbar={{
              actions: [
                // 表格配置按钮
                <Button
                  key="config"
                  icon={<SettingOutlined />}
                  onClick={() =>
                    navigate(
                      `/settings/performance-config?platform=${selectedPlatform}&tab=dimension`
                    )
                  }
                >
                  表格配置
                </Button>,
                // 价格类型选择器
                <div
                  key="price"
                  className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
                >
                  <span className="text-sm font-medium text-primary-700">
                    价格类型
                  </span>
                  <Select
                    value={selectedPriceType}
                    onChange={setSelectedPriceType}
                    style={{ width: 130 }}
                    size="small"
                    options={[
                      ...priceTypes.map(pt => ({
                        label: pt.label,
                        value: pt.key,
                      })),
                      {
                        label: '隐藏价格',
                        value: null,
                      },
                    ]}
                  />
                </div>,
              ],
            }}
            options={{
              reload: async () => {
                await search({});
                message.success('数据已刷新');
                return true;
              },
              density: false, // 关闭密度调整（避免混乱）
              setting: true, // 开启列设置
            }}
            scroll={{ x: 1500 }}
            size="middle"
            locale={{
              emptyText: (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    暂无表现数据
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {PLATFORM_NAMES[selectedPlatform]} 平台暂无达人表现数据
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    请前往"数据导入管理"导入达人表现数据
                  </p>
                  <Button
                    type="primary"
                    className="mt-4"
                    onClick={() =>
                      navigate(
                        `/settings/performance-config?platform=${selectedPlatform}&tab=import`
                      )
                    }
                  >
                    立即导入数据
                  </Button>
                </div>
              ),
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}
