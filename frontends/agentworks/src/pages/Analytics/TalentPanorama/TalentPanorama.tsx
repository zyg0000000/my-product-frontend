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
import { Tabs, Button, App, Alert, Tag, Tooltip, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import type { Platform } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { usePanoramaData } from '../../../hooks/usePanoramaData';
import { usePanoramaFilters } from '../../../hooks/usePanoramaFilters';
import { usePanoramaColumns } from '../../../hooks/usePanoramaColumns';
import { useTagConfigs } from '../../../hooks/useTagConfigs';
import { ModularFilterPanel } from '../../../components/FilterPanel';
import { ViewModeSelector } from '../../../components/ViewModeSelector';
import { ColumnSelector } from '../../../components/ColumnSelector';
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
import {
  getFieldById,
  type FieldDefinition,
} from '../../../config/panoramaFields';

/**
 * 格式化价格（从分转换为元）
 */
function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A';
  // 价格存储单位为分，需要除以100转换为元
  const yuan = price / 100;
  return `¥${yuan.toLocaleString()}`;
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

  // 价格档位显示状态（用于价格列切换显示）
  const [displayPriceType, setDisplayPriceType] =
    useState<string>('video_60plus');

  // 列选择器状态
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const columnsConfig = usePanoramaColumns({
    platform: selectedPlatform,
    viewMode,
  });

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
    filtersByModule,
    filters,
    hasActiveFilters,
    loading: filtersLoading,
    updateFilter,
    resetFilters,
    buildQueryParams,
  } = usePanoramaFilters({
    modules: activeModules,
    platform: selectedPlatform,
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
  // 注意：handleSearch 不应放入依赖数组，否则会导致无限循环
  // 因为 handleSearch 依赖 columnsConfig.selectedFields，而我们只想在平台/视角/客户变化时触发搜索
  useEffect(() => {
    if (!filtersLoading) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, filtersLoading, viewMode, selectedCustomers.length]);

  // 执行搜索
  const handleSearch = useCallback(() => {
    const queryParams = buildQueryParams();
    // 转换为 API 参数格式
    const apiParams: Omit<
      PanoramaSearchParams,
      'platform' | 'page' | 'pageSize'
    > = {
      searchTerm: queryParams.searchTerm as string | undefined,
      rebateMin: queryParams.rebateMin as number | undefined,
      rebateMax: queryParams.rebateMax as number | undefined,
      priceMin: queryParams.priceMin as number | undefined,
      priceMax: queryParams.priceMax as number | undefined,
      priceType: queryParams.priceType as string | undefined, // 价格档位类型
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
      // 传递选中的字段列表
      fields: columnsConfig.selectedFields,
    };
    search(apiParams);
  }, [
    buildQueryParams,
    search,
    viewMode,
    selectedCustomers,
    columnsConfig.selectedFields,
  ]);

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
    // 重置价格档位到对应平台的默认值
    setDisplayPriceType(platform === 'xiaohongshu' ? 'video' : 'video_60plus');
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

  /**
   * 根据字段定义生成 ProTable 列配置
   */
  const buildColumnFromField = useCallback(
    (field: FieldDefinition): ProColumns<PanoramaTalentItem> | null => {
      const baseColumn: ProColumns<PanoramaTalentItem> = {
        title: field.name,
        dataIndex: field.id,
        key: field.id,
        width: field.width || 100,
        ellipsis: field.type === 'array' || field.type === 'string',
      };

      // 特殊字段处理
      switch (field.id) {
        case 'name':
          return {
            ...baseColumn,
            fixed: 'left',
            render: (_, record) => (
              <a
                onClick={() => navigate(`/talents/${record.oneId}`)}
                className="font-medium text-primary-600 hover:text-primary-800 cursor-pointer"
              >
                {record.name || 'N/A'}
              </a>
            ),
          };

        case 'rebate':
          return {
            ...baseColumn,
            render: (_, record) => formatPercent(record.rebate),
          };

        case 'prices': {
          // 价格列：单列显示，支持切换档位
          // 根据平台获取价格档位配置
          const priceTypeLabels: Record<string, string> = {
            video_60plus: '60s+',
            video_21_60: '21-60s',
            video_1_20: '1-20s',
            video: '视频笔记',
            image: '图文笔记',
          };

          // 根据平台构建下拉菜单
          const priceTypeMenuItems: MenuProps['items'] =
            selectedPlatform === 'xiaohongshu'
              ? [
                  { key: 'video', label: '视频笔记' },
                  { key: 'image', label: '图文笔记' },
                ]
              : [
                  { key: 'video_60plus', label: '60s+' },
                  { key: 'video_21_60', label: '21-60s' },
                  { key: 'video_1_20', label: '1-20s' },
                ];

          return {
            ...baseColumn,
            title: (
              <Dropdown
                menu={{
                  items: priceTypeMenuItems,
                  selectedKeys: [displayPriceType],
                  onClick: ({ key }) => setDisplayPriceType(key),
                }}
                trigger={['click']}
              >
                <span className="cursor-pointer flex items-center gap-1">
                  报价({priceTypeLabels[displayPriceType] || displayPriceType})
                  <CaretDownOutlined className="text-xs" />
                </span>
              </Dropdown>
            ),
            render: (_, record) => {
              const prices = record.prices;
              if (!prices) return 'N/A';

              // 显示当前选中档位的价格
              const currentPrice =
                prices[displayPriceType as keyof typeof prices];

              // 构建 Tooltip 显示所有档位
              const allPrices: string[] = [];
              if (prices.video_60plus)
                allPrices.push(`60s+: ${formatPrice(prices.video_60plus)}`);
              if (prices.video_21_60)
                allPrices.push(`21-60s: ${formatPrice(prices.video_21_60)}`);
              if (prices.video_1_20)
                allPrices.push(`1-20s: ${formatPrice(prices.video_1_20)}`);
              if (prices.video)
                allPrices.push(`视频: ${formatPrice(prices.video)}`);
              if (prices.image)
                allPrices.push(`图文: ${formatPrice(prices.image)}`);

              return (
                <Tooltip
                  title={
                    allPrices.length > 0 ? allPrices.join(' | ') : '暂无报价'
                  }
                >
                  <span>{formatPrice(currentPrice as number | undefined)}</span>
                </Tooltip>
              );
            },
          };
        }

        case 'followerCount':
        case 'fansCount':
        case 'avgPlayCount':
        case 'avgLikeCount':
        case 'avgCommentCount':
        case 'avgShareCount':
        case 'worksCount':
        case 'newWorksCount':
        case 'cpm':
          return {
            ...baseColumn,
            render: (_, record) => {
              const value =
                (record as any)[field.id] ??
                (record as any).performance?.[field.id];
              return formatNumber(value);
            },
          };

        case 'fansChange':
          return {
            ...baseColumn,
            render: (_, record) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = (record as any).performance?.fansChange;
              if (value === null || value === undefined) return 'N/A';
              const sign = value > 0 ? '+' : '';
              const color =
                value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : '';
              return (
                <span className={color}>
                  {sign}
                  {formatNumber(value)}
                </span>
              );
            },
          };

        case 'engagementRate':
        case 'audienceGenderMale':
        case 'audienceGenderFemale':
        case 'audienceAge18_23':
        case 'audienceAge24_30':
        case 'audienceAge31_40':
        case 'audienceAge41_50':
        case 'audienceAge50Plus':
        case 'fansGrowthRate7d':
        case 'fansGrowthRate30d':
          return {
            ...baseColumn,
            render: (_, record) => {
              const value =
                (record as any)[field.id] ??
                (record as any).performance?.[field.id];
              return formatPercent(value);
            },
          };

        case 'contentTags':
          return {
            ...baseColumn,
            render: (_, record) =>
              record.contentTags?.length
                ? record.contentTags.join(', ')
                : 'N/A',
          };

        case 'customerRelations':
          return {
            ...baseColumn,
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
          };

        case 'platform':
        case 'platformAccountId':
        case 'agencyId':
        case 'xingtuId':
        case 'mcnName':
        case 'status':
        case 'rebateSource':
          return {
            ...baseColumn,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_, record) => (record as any)[field.id] || 'N/A',
          };

        case 'starLevel':
        case 'viralPotential':
        case 'contentQualityScore':
        case 'audienceQualityScore':
        case 'commercialValueScore':
        case 'cooperationCount':
          return {
            ...baseColumn,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (_, record) => formatNumber((record as any)[field.id]),
          };

        case 'createdAt':
        case 'updatedAt':
        case 'rebateEffectiveDate':
        case 'lastCooperationDate':
        case 'addedAt':
          return {
            ...baseColumn,
            render: (_, record) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = (record as any)[field.id];
              if (!value) return 'N/A';
              return new Date(value).toLocaleDateString('zh-CN');
            },
          };

        default:
          // 默认处理
          return {
            ...baseColumn,

            render: (_, record) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = (record as any)[field.id];
              if (value === null || value === undefined) return 'N/A';
              if (Array.isArray(value)) return value.join(', ') || 'N/A';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value);
            },
          };
      }
    },
    [navigate, displayPriceType, selectedPlatform]
  );

  /**
   * 客户视角下的重要程度列
   */
  const importanceColumn: ProColumns<PanoramaTalentItem> = useMemo(
    () => ({
      title: '重要程度',
      dataIndex: 'customerRelations',
      key: 'importance',
      width: 100,
      render: (_, record) => {
        const relations = record.customerRelations;
        if (!relations || relations.length === 0) return '-';

        const importance = relations[0]?.importance;
        if (!importance) return '-';

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
    }),
    [tagConfigs.importanceLevels]
  );

  /**
   * 客户视角下的业务标签列
   */
  const businessTagsColumn: ProColumns<PanoramaTalentItem> = useMemo(
    () => ({
      title: '业务标签',
      dataIndex: 'customerRelations',
      key: 'businessTags',
      width: 180,
      ellipsis: true,
      render: (_, record) => {
        const relations = record.customerRelations;
        if (!relations || relations.length === 0) return '-';

        const allTags = new Set<string>();
        relations.forEach(r => {
          r.businessTags?.forEach(tag => allTags.add(tag));
        });

        if (allTags.size === 0) return '-';

        const tagArray = Array.from(allTags);

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
    }),
    [tagConfigs.businessTags]
  );

  // 表格列配置（根据 selectedFields 动态生成）
  const columns: ProColumns<PanoramaTalentItem>[] = useMemo(() => {
    const result: ProColumns<PanoramaTalentItem>[] = [];

    // 根据用户选择的字段生成列
    for (const fieldId of columnsConfig.selectedFields) {
      const field = getFieldById(fieldId);
      if (!field) continue;

      // 客户关系字段特殊处理（包含重要程度和业务标签）
      if (fieldId === 'customerRelations') {
        const col = buildColumnFromField(field);
        if (col) result.push(col);

        // 客户视角下自动添加重要程度和业务标签列
        if (viewMode === 'customer' && selectedCustomers.length > 0) {
          result.push(importanceColumn);
          result.push(businessTagsColumn);
        }
        continue;
      }

      const column = buildColumnFromField(field);
      if (column) {
        result.push(column);
      }
    }

    return result;
  }, [
    columnsConfig.selectedFields,
    buildColumnFromField,
    viewMode,
    selectedCustomers.length,
    importanceColumn,
    businessTagsColumn,
  ]);

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
            filtersByModule={filtersByModule}
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
                  key="columns"
                  icon={<SettingOutlined />}
                  onClick={() => setColumnSelectorOpen(true)}
                >
                  列设置
                  {columnsConfig.hasCustomSelection && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded">
                      {columnsConfig.selectedCount}
                    </span>
                  )}
                </Button>,
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
              setting: false, // 使用自定义列选择器，禁用 ProTable 内置设置
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

        {/* 列选择器抽屉 */}
        <ColumnSelector
          open={columnSelectorOpen}
          onClose={() => setColumnSelectorOpen(false)}
          availableFields={columnsConfig.availableFields}
          fieldsByCategory={columnsConfig.fieldsByCategory}
          selectedFields={columnsConfig.selectedFields}
          onToggleField={columnsConfig.toggleField}
          onToggleCategory={columnsConfig.toggleCategory}
          onResetToDefault={columnsConfig.resetToDefault}
          categoryStats={columnsConfig.categoryStats}
          categories={columnsConfig.categories}
          hasCustomSelection={columnsConfig.hasCustomSelection}
        />
      </div>
    </PageTransition>
  );
}

export default TalentPanorama;
