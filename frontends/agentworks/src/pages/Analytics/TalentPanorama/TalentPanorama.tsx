/**
 * 达人全景页面
 *
 * 360° 达人综合检索视图：
 * - 视角切换：全量达人库 / 客户视角（支持多客户）
 * - 多维度筛选：基础信息 + 客户标签（仅客户视角）+ 表现数据
 * - 可扩展筛选模块架构
 * - 聚合展示达人多源数据
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Tabs, Button, App, Alert, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Platform } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { usePanoramaData } from '../../../hooks/usePanoramaData';
import { usePanoramaFilters } from '../../../hooks/usePanoramaFilters';
import { useTagConfigs } from '../../../hooks/useTagConfigs';
import { ModularFilterPanel } from '../../../components/FilterPanel';
import { ViewModeSelector } from '../../../components/ViewModeSelector';
import {
  BasicInfoModule,
  CustomerTagModule,
  PerformanceModule,
} from '../../../modules/filters';
import { PageTransition } from '../../../components/PageTransition';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import type {
  PanoramaTalentItem,
  ViewMode,
} from '../../../api/customerTalents';
import type { PanoramaSearchParams } from '../../../api/customerTalents';
import type { FilterModule } from '../../../types/filterModule';

/**
 * 格式化价格
 */
function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A';
  return `¥${price.toLocaleString()}`;
}

/**
 * 格式化百分比
 */
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * 格式化数字
 */
function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString();
}

export function TalentPanorama() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  // 标签配置（用于动态颜色）
  const { configs: tagConfigs } = useTagConfigs();

  // 平台配置
  const { getPlatformList, loading: configLoading } = usePlatformConfig(false);
  const platforms = getPlatformList();
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    platforms[0] || 'douyin'
  );

  // 视角模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  // 根据视角模式动态决定筛选模块
  const activeModules = useMemo<FilterModule[]>(() => {
    if (viewMode === 'customer' && selectedCustomers.length > 0) {
      // 客户视角：基础信息 + 客户标签 + 表现数据
      return [BasicInfoModule, CustomerTagModule, PerformanceModule];
    }
    // 全量模式：基础信息 + 表现数据（无客户标签）
    return [BasicInfoModule, PerformanceModule];
  }, [viewMode, selectedCustomers.length]);

  // 筛选模块管理
  const {
    modules,
    filters,
    hasActiveFilters,
    loading: filtersLoading,
    updateFilter,
    resetFilters,
    buildQueryParams,
  } = usePanoramaFilters({
    modules: activeModules,
  });

  // 数据管理
  const {
    talents,
    loading: dataLoading,
    error,
    total,
    currentPage,
    pageSize,
    setPage,
    setPageSize,
    search,
    refresh,
  } = usePanoramaData(selectedPlatform);

  // 首次加载和视角/客户变化时执行搜索
  useEffect(() => {
    if (!filtersLoading) {
      handleSearch();
    }
  }, [selectedPlatform, filtersLoading, viewMode, selectedCustomers]);

  // 执行搜索
  const handleSearch = useCallback(() => {
    const queryParams = buildQueryParams();
    // 转换为 API 参数格式
    const apiParams: Omit<
      PanoramaSearchParams,
      'platform' | 'page' | 'pageSize'
    > = {
      searchTerm: queryParams.searchTerm as string | undefined,
      tiers: queryParams.tiers as string[] | undefined,
      rebateMin: queryParams.rebateMin as number | undefined,
      rebateMax: queryParams.rebateMax as number | undefined,
      priceMin: queryParams.priceMin as number | undefined,
      priceMax: queryParams.priceMax as number | undefined,
      contentTags: queryParams.contentTags as string[] | undefined,
      // 客户视角参数
      customerNames:
        viewMode === 'customer' && selectedCustomers.length > 0
          ? selectedCustomers
          : undefined,
      importance: queryParams.importance as string[] | undefined,
      businessTags: queryParams.businessTags as string[] | undefined,
      performanceFilters: queryParams.performanceFilters as
        | Record<string, { min?: number; max?: number }>
        | undefined,
    };
    search(apiParams);
  }, [buildQueryParams, search, viewMode, selectedCustomers]);

  // 重置筛选
  const handleReset = useCallback(() => {
    resetFilters();
    // 保持当前视角模式，重新搜索
    const apiParams: Omit<
      PanoramaSearchParams,
      'platform' | 'page' | 'pageSize'
    > = {
      customerNames:
        viewMode === 'customer' && selectedCustomers.length > 0
          ? selectedCustomers
          : undefined,
    };
    search(apiParams);
  }, [resetFilters, search, viewMode, selectedCustomers]);

  // 处理平台切换
  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform);
    resetFilters();
  };

  // 处理视角模式切换
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'all') {
      setSelectedCustomers([]);
    }
    resetFilters();
  };

  // 处理客户选择变化
  const handleCustomersChange = (customers: string[]) => {
    setSelectedCustomers(customers);
    resetFilters();
  };

  // 表格列配置（根据视角模式动态调整）
  const columns: ProColumns<PanoramaTalentItem>[] = useMemo(() => {
    const baseColumns: ProColumns<PanoramaTalentItem>[] = [
      {
        title: '达人名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        fixed: 'left',
        render: (_, record) => (
          <a
            onClick={() => navigate(`/talents/${record.oneId}`)}
            className="font-medium text-primary-600 hover:text-primary-800 cursor-pointer"
          >
            {record.name || 'N/A'}
          </a>
        ),
      },
      {
        title: 'OneID',
        dataIndex: 'oneId',
        key: 'oneId',
        width: 120,
        ellipsis: true,
      },
      {
        title: '层级',
        dataIndex: 'talentTier',
        key: 'talentTier',
        width: 80,
        render: (_, record) => record.talentTier || 'N/A',
      },
      {
        title: '返点',
        dataIndex: 'rebate',
        key: 'rebate',
        width: 80,
        render: (_, record) => formatPercent(record.rebate),
      },
      {
        title: '60s+视频报价',
        dataIndex: ['prices', 'video_60plus'],
        key: 'price_60plus',
        width: 120,
        render: (_, record) => formatPrice(record.prices?.video_60plus),
      },
      {
        title: '21-60s视频报价',
        dataIndex: ['prices', 'video_21_60'],
        key: 'price_21_60',
        width: 130,
        render: (_, record) => formatPrice(record.prices?.video_21_60),
      },
      {
        title: '粉丝数',
        dataIndex: 'followerCount',
        key: 'followerCount',
        width: 100,
        render: (_, record) => formatNumber(record.followerCount),
      },
      {
        title: '内容标签',
        dataIndex: 'contentTags',
        key: 'contentTags',
        width: 150,
        ellipsis: true,
        render: (_, record) =>
          record.contentTags?.length ? record.contentTags.join(', ') : 'N/A',
      },
    ];

    // 客户视角模式：添加客户关系列
    if (viewMode === 'customer' && selectedCustomers.length > 0) {
      baseColumns.push(
        {
          title: '关注客户',
          dataIndex: 'customerRelations',
          key: 'customerRelations',
          width: 150,
          render: (_, record) => {
            const relations = record.customerRelations;
            if (!relations || relations.length === 0) return '-';

            if (relations.length === 1) {
              return relations[0].customerName;
            }

            return (
              <Tooltip title={relations.map(r => r.customerName).join(', ')}>
                <span>
                  {relations[0].customerName}
                  <Tag className="ml-1" color="blue">
                    +{relations.length - 1}
                  </Tag>
                </span>
              </Tooltip>
            );
          },
        },
        {
          title: '重要程度',
          dataIndex: 'customerRelations',
          key: 'importance',
          width: 100,
          render: (_, record) => {
            const relations = record.customerRelations;
            if (!relations || relations.length === 0) return '-';

            // 显示第一个客户的重要程度
            const importance = relations[0]?.importance;
            if (!importance) return '-';

            // 从配置中查找颜色（按 name 匹配）
            const config = tagConfigs.importanceLevels.find(
              item => item.name === importance
            );
            if (config?.bgColor && config?.textColor) {
              return (
                <Tag
                  style={{
                    backgroundColor: config.bgColor,
                    color: config.textColor,
                    border: 'none',
                  }}
                >
                  {importance}
                </Tag>
              );
            }
            return <Tag>{importance}</Tag>;
          },
        },
        {
          title: '业务标签',
          dataIndex: 'customerRelations',
          key: 'businessTags',
          width: 180,
          ellipsis: true,
          render: (_, record) => {
            const relations = record.customerRelations;
            if (!relations || relations.length === 0) return '-';

            // 合并所有客户的业务标签（去重）
            const allTags = new Set<string>();
            relations.forEach(r => {
              r.businessTags?.forEach(tag => allTags.add(tag));
            });

            if (allTags.size === 0) return '-';

            const tagArray = Array.from(allTags);

            // 渲染带颜色的标签
            const renderTag = (tag: string) => {
              const config = tagConfigs.businessTags.find(
                item => item.name === tag
              );
              if (config?.bgColor && config?.textColor) {
                return (
                  <Tag
                    key={tag}
                    className="mr-1"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.textColor,
                      border: 'none',
                    }}
                  >
                    {tag}
                  </Tag>
                );
              }
              return (
                <Tag key={tag} className="mr-1">
                  {tag}
                </Tag>
              );
            };

            if (tagArray.length <= 2) {
              return tagArray.map(renderTag);
            }

            return (
              <Tooltip title={tagArray.join(', ')}>
                <span>
                  {tagArray.slice(0, 2).map(renderTag)}
                  <Tag color="blue">+{tagArray.length - 2}</Tag>
                </span>
              </Tooltip>
            );
          },
        }
      );
    }

    return baseColumns;
  }, [navigate, viewMode, selectedCustomers.length, tagConfigs]);

  const loading = configLoading || filtersLoading || dataLoading;

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">达人全景</h1>
          <p className="text-gray-600 mt-1 text-sm">
            360° 达人综合检索，整合基础信息、客户标签、表现数据多维筛选
          </p>
        </div>

        {/* 平台 Tabs */}
        <Tabs
          activeKey={selectedPlatform}
          onChange={key => handlePlatformChange(key as Platform)}
          items={platforms.map(platform => ({
            key: platform,
            label: PLATFORM_NAMES[platform],
          }))}
        />

        {/* 视角选择器 */}
        <ViewModeSelector
          viewMode={viewMode}
          selectedCustomers={selectedCustomers}
          onViewModeChange={handleViewModeChange}
          onCustomersChange={handleCustomersChange}
          disabled={dataLoading}
        />

        {/* 错误提示 */}
        {error && (
          <Alert
            message="数据加载失败"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {/* 模块化筛选面板 */}
        {!filtersLoading && (
          <ModularFilterPanel
            modules={modules}
            filters={filters}
            onFilterChange={updateFilter}
            onReset={handleReset}
            onSearch={handleSearch}
            loading={dataLoading}
            defaultExpanded={true}
          />
        )}

        {/* 数据表格 */}
        {loading && talents.length === 0 ? (
          <TableSkeleton columnCount={10} rowCount={10} />
        ) : (
          <ProTable<PanoramaTalentItem>
            columns={columns}
            dataSource={talents}
            rowKey={record =>
              record.oneId || record.name || String(Math.random())
            }
            loading={dataLoading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条`,
              onChange: (page, size) => {
                if (size !== pageSize) {
                  setPageSize(size);
                } else {
                  setPage(page);
                }
              },
            }}
            search={false}
            cardBordered
            headerTitle={
              <div className="flex items-center gap-3">
                <span className="font-medium">达人列表</span>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm text-gray-500">共 {total} 个达人</span>
                {viewMode === 'customer' && selectedCustomers.length > 0 && (
                  <>
                    <div className="h-4 w-px bg-gray-300" />
                    <span className="text-sm text-blue-600">
                      客户视角:{' '}
                      {selectedCustomers.length === 1
                        ? selectedCustomers[0]
                        : `${selectedCustomers.length} 个客户`}
                    </span>
                  </>
                )}
              </div>
            }
            toolbar={{
              actions: [
                <Button
                  key="refresh"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    refresh();
                    message.success('数据已刷新');
                  }}
                >
                  刷新
                </Button>,
                <Button
                  key="search"
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={dataLoading}
                >
                  搜索
                </Button>,
              ],
            }}
            options={{
              reload: async () => {
                await refresh();
                message.success('数据已刷新');
                return true;
              },
              density: false,
              setting: true,
            }}
            scroll={{ x: viewMode === 'customer' ? 1800 : 1500 }}
            size="middle"
            locale={{
              emptyText: (
                <div className="text-center py-12">
                  <SearchOutlined className="text-5xl text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    暂无搜索结果
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {viewMode === 'customer' && selectedCustomers.length === 0
                      ? '请先选择要查看的客户'
                      : hasActiveFilters
                        ? '请调整筛选条件后重试'
                        : `${PLATFORM_NAMES[selectedPlatform]} 平台暂无达人数据`}
                  </p>
                  {hasActiveFilters && (
                    <Button type="link" onClick={handleReset} className="mt-2">
                      清空筛选条件
                    </Button>
                  )}
                </div>
              ),
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default TalentPanorama;
