/**
 * 达人表现趋势分析页面
 * 支持多达人对比、单/双指标选择、时间范围筛选
 *
 * @version 3.2.0 - 基于 performanceTracking 功能开关过滤平台
 *
 * 技术说明：
 * - 多达人模式（2-5人）：单指标，Line 图表，按达人区分颜色
 * - 单达人模式（1人）：支持双指标，DualAxes 双轴图，按指标区分颜色
 * - 只显示启用了 performanceTracking 的平台（v3.2）
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Select,
  Radio,
  Checkbox,
  DatePicker,
  Empty,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Line, DualAxes } from '@ant-design/charts';
import type { Platform } from '../../types/talent';
import { PLATFORM_NAMES } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import {
  usePerformanceHistory,
  type TalentMetrics,
} from '../../hooks/usePerformanceHistory';
import { TalentSelector } from '../../components/Performance/TalentSelector';
import { PageTransition } from '../../components/PageTransition';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * 可用于趋势分析的指标配置
 * 2025-11-30 已验证：与数据库 talent_performance.metrics 字段同步
 *
 * 已移除：
 * - follower_growth_rate（涨粉率）- 数据库中不存在
 * - viral_rate（爆款率）- 值始终为 0，无分析价值
 */
const METRIC_OPTIONS = [
  { key: 'cpm_60s_expected', label: '60s预期CPM', unit: '' },
  { key: 'follower_growth', label: '涨粉量', unit: '' },
  { key: 'followers', label: '粉丝数', unit: '万', isLargeNumber: true },
  {
    key: 'interaction_rate_30d',
    label: '30日互动率',
    unit: '%',
    isPercentage: true,
  },
  {
    key: 'completion_rate_30d',
    label: '30日完播率',
    unit: '%',
    isPercentage: true,
  },
  { key: 'spread_index', label: '传播指数', unit: '' },
  {
    key: 'expected_plays',
    label: '预期播放量',
    unit: '万',
    isLargeNumber: true,
  },
  {
    key: 'connected_users',
    label: '触达用户数',
    unit: '万',
    isLargeNumber: true,
  },
];

// 达人颜色配置（最多5个达人）
const TALENT_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// 指标颜色配置（用于双轴图，左轴/右轴）
const METRIC_COLORS = ['#4f46e5', '#10b981'];

// 时间范围预设
const TIME_PRESETS = [
  { label: '近30天', days: 30 },
  { label: '近90天', days: 90 },
  { label: '近180天', days: 180 },
  { label: '自定义', days: 0 },
];

export function PerformanceAnalytics() {
  // 平台配置 - 只获取启用了 performanceTracking 的平台
  const { getPlatformsByFeature, loading: platformLoading } =
    usePlatformConfig(false);
  const platforms = getPlatformsByFeature('performanceTracking');

  // 状态
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    platforms[0] || 'douyin'
  );
  const [selectedTalents, setSelectedTalents] = useState<
    Array<{ oneId: string; name: string }>
  >([]);
  // 指标选择：支持单选或多选（根据达人数量动态切换）
  // - 多达人模式：单选（Radio）
  // - 单达人模式：多选（Checkbox，最多2个）
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'cpm_60s_expected',
  ]);
  const [timePreset, setTimePreset] = useState<number>(30);

  // 判断是否为单达人模式（可选择双指标）
  const isSingleTalentMode = selectedTalents.length === 1;
  const [customRange, setCustomRange] = useState<
    [dayjs.Dayjs, dayjs.Dayjs] | null
  >(null);

  /**
   * 模式切换时自动调整指标选择
   * - 从单达人（双指标）→ 多达人（单指标）：保留第一个指标
   * - 从多达人 → 单达人：保持当前指标（允许后续添加第二个）
   */
  useEffect(() => {
    if (!isSingleTalentMode && selectedMetrics.length > 1) {
      // 切换到多达人模式时，如果选了多个指标，只保留第一个
      setSelectedMetrics(prev => [prev[0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSingleTalentMode]);

  // 计算时间范围
  const dateRange = useMemo(() => {
    if (timePreset === 0 && customRange) {
      return {
        startDate: customRange[0].format('YYYY-MM-DD'),
        endDate: customRange[1].format('YYYY-MM-DD'),
      };
    }
    const endDate = dayjs();
    const startDate = endDate.subtract(timePreset || 30, 'day');
    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
    };
  }, [timePreset, customRange]);

  // 获取历史数据（支持多指标）
  const { data, loading, error } = usePerformanceHistory({
    platform: selectedPlatform,
    oneIds: selectedTalents.map(t => t.oneId),
    metrics: selectedMetrics,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // 处理达人选择
  const handleTalentSelect = (talent: { oneId: string; name: string }) => {
    if (selectedTalents.length >= 5) {
      return; // 最多5个
    }
    if (selectedTalents.some(t => t.oneId === talent.oneId)) {
      return; // 已选中
    }
    setSelectedTalents([...selectedTalents, talent]);
  };

  const handleTalentRemove = (oneId: string) => {
    setSelectedTalents(selectedTalents.filter(t => t.oneId !== oneId));
  };

  // 获取当前选中的指标配置（支持多指标）
  const currentMetricConfigs = useMemo(
    () =>
      selectedMetrics
        .map(key => METRIC_OPTIONS.find(m => m.key === key))
        .filter(Boolean),
    [selectedMetrics]
  );
  // 兼容：单指标时的配置
  const currentMetricConfig = currentMetricConfigs[0];

  /**
   * 转换数据为图表格式
   * - 多达人模式：每个达人一条线，通过 talent 字段区分颜色
   * - 单达人双指标模式：每个指标一条线，通过 metric 字段区分
   */
  const chartData = useMemo(() => {
    if (!data?.series || data.series.length === 0) return [];

    // 单达人双指标模式
    if (isSingleTalentMode && selectedMetrics.length === 2) {
      const result: Array<{
        date: string;
        value1: number;
        value2: number;
      }> = [];

      const talent = selectedTalents[0];
      const [metric1, metric2] = selectedMetrics;
      const config1 = currentMetricConfigs[0];
      const config2 = currentMetricConfigs[1];

      data.series.forEach(item => {
        const talentData = item[talent.oneId];
        if (!talentData || typeof talentData === 'string') return;

        // 类型守卫：确保 talentData 是 TalentMetrics
        const metrics = talentData as TalentMetrics;
        let value1 = metrics[metric1] as number | null;
        let value2 = metrics[metric2] as number | null;

        // 转换 value1
        if (value1 !== null && value1 !== undefined) {
          if (config1?.isPercentage) value1 = value1 * 100;
          if (config1?.isLargeNumber && value1 > 10000) value1 = value1 / 10000;
        }

        // 转换 value2
        if (value2 !== null && value2 !== undefined) {
          if (config2?.isPercentage) value2 = value2 * 100;
          if (config2?.isLargeNumber && value2 > 10000) value2 = value2 / 10000;
        }

        if (
          value1 !== null &&
          value1 !== undefined &&
          value2 !== null &&
          value2 !== undefined
        ) {
          result.push({
            date: item.date,
            value1: Number(value1.toFixed(2)),
            value2: Number(value2.toFixed(2)),
          });
        }
      });

      return result;
    }

    // 多达人单指标模式（或单达人单指标）
    const result: Array<{
      date: string;
      value: number;
      talent: string;
      unit: string;
    }> = [];

    const selectedMetric = selectedMetrics[0];

    data.series.forEach(item => {
      selectedTalents.forEach(talent => {
        const talentData = item[talent.oneId];
        if (!talentData || typeof talentData === 'string') return;

        // 类型守卫：确保 talentData 是 TalentMetrics
        const metrics = talentData as TalentMetrics;
        let value = metrics[selectedMetric] as number | null;
        if (value === null || value === undefined) return;

        // 百分比转换（数据库存储 0.03 → 显示 3%）
        if (currentMetricConfig?.isPercentage) {
          value = value * 100;
        }

        // 大数值转万（粉丝数、播放量、触达用户数）
        if (currentMetricConfig?.isLargeNumber && value > 10000) {
          value = value / 10000;
        }

        result.push({
          date: item.date,
          value: Number(value.toFixed(2)),
          talent: talent.name,
          unit: currentMetricConfig?.unit || '',
        });
      });
    });

    return result;
  }, [
    data,
    selectedTalents,
    selectedMetrics,
    currentMetricConfig,
    currentMetricConfigs,
    isSingleTalentMode,
  ]);

  /**
   * 图表配置 - 多达人单指标模式（Line 图）
   * 通过 colorField: 'talent' 区分不同达人的线条颜色
   */
  const lineChartConfig = useMemo(() => {
    if (chartData.length === 0) return null;
    // 双轴图模式时不使用此配置
    if (isSingleTalentMode && selectedMetrics.length === 2) return null;

    // 获取达人名称列表（按选择顺序）
    const talentNames = selectedTalents.map(t => t.name);
    // 为每个达人分配颜色
    const colors = talentNames.map(
      (_, i) => TALENT_COLORS[i % TALENT_COLORS.length]
    );

    // Y 轴标题
    const yAxisTitle = currentMetricConfig
      ? `${currentMetricConfig.label}${currentMetricConfig.unit ? ` (${currentMetricConfig.unit})` : ''}`
      : '';

    return {
      data: chartData,
      xField: 'date',
      yField: 'value',
      colorField: 'talent',
      shapeField: 'smooth',
      scale: {
        color: {
          domain: talentNames,
          range: colors,
        },
      },
      legend: { color: { position: 'top' as const, itemMarker: 'smooth' } },
      axis: {
        x: { tickCount: 8 },
        y: { title: yAxisTitle },
      },
      style: { lineWidth: 2 },
      point: { size: 3, shape: 'circle' },
      tooltip: {
        title: 'date',
        items: [
          {
            channel: 'y',
            name: 'talent',
            valueFormatter: (value: number) => {
              const unit = currentMetricConfig?.unit || '';
              return `${value}${unit}`;
            },
          },
        ],
      },
    };
  }, [
    chartData,
    selectedTalents,
    currentMetricConfig,
    isSingleTalentMode,
    selectedMetrics.length,
  ]);

  /**
   * 图表配置 - 单达人双指标模式（DualAxes 双轴图）
   * 左 Y 轴：第一个指标，右 Y 轴：第二个指标
   *
   * @ant-design/charts 2.x DualAxes 配置要点：
   * - 使用单一数据源，通过不同的 yField 区分指标
   * - 每个 child 的 yField 对应数据中的不同字段
   */
  const dualAxesConfig = useMemo(() => {
    if (chartData.length === 0) return null;
    // 只在单达人双指标模式使用
    if (!isSingleTalentMode || selectedMetrics.length !== 2) return null;

    const config1 = currentMetricConfigs[0];
    const config2 = currentMetricConfigs[1];

    const label1 = config1
      ? `${config1.label}${config1.unit ? ` (${config1.unit})` : ''}`
      : '指标1';
    const label2 = config2
      ? `${config2.label}${config2.unit ? ` (${config2.unit})` : ''}`
      : '指标2';

    // 类型断言：此时 chartData 是双指标模式的数据结构
    const dualData = chartData as Array<{
      date: string;
      value1: number;
      value2: number;
    }>;

    return {
      data: dualData,
      xField: 'date',
      legend: false,
      // 根级别禁用默认 Y 轴，完全由 children 控制
      axis: {
        y: false,
      },
      children: [
        {
          type: 'line' as const,
          yField: 'value1',
          shapeField: 'smooth',
          style: { stroke: METRIC_COLORS[0], lineWidth: 2 },
          point: {
            sizeField: 3,
            style: { fill: METRIC_COLORS[0] },
          },
          tooltip: {
            title: 'date',
            items: [{ channel: 'y', name: label1 }],
          },
          axis: {
            y: {
              position: 'left' as const,
              title: label1,
              titleFill: METRIC_COLORS[0],
            },
          },
        },
        {
          type: 'line' as const,
          yField: 'value2',
          shapeField: 'smooth',
          style: { stroke: METRIC_COLORS[1], lineWidth: 2 },
          point: {
            sizeField: 3,
            style: { fill: METRIC_COLORS[1] },
          },
          tooltip: {
            title: 'date',
            items: [{ channel: 'y', name: label2 }],
          },
          axis: {
            y: {
              position: 'right' as const,
              title: label2,
              titleFill: METRIC_COLORS[1],
            },
          },
        },
      ],
    };
  }, [
    chartData,
    isSingleTalentMode,
    selectedMetrics.length,
    currentMetricConfigs,
  ]);

  // 判断使用哪种图表
  const useDualAxes = isSingleTalentMode && selectedMetrics.length === 2;

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* 页面标题 - 与 PerformanceHome 保持一致 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">趋势分析</h1>
          <p className="text-gray-600 mt-1 text-sm">
            分析达人表现指标的历史变化趋势，支持多达人对比
          </p>
        </div>

        {/* 控制面板 - 使用 ProCard */}
        <ProCard bodyStyle={{ padding: 16 }}>
          <div className="space-y-4">
            {/* 第一行：平台 + 达人选择 */}
            <div className="flex flex-wrap items-start gap-4">
              {/* 平台选择 */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  平台
                </label>
                <Select
                  value={selectedPlatform}
                  onChange={value => {
                    setSelectedPlatform(value);
                    setSelectedTalents([]); // 切换平台时清空已选达人
                  }}
                  style={{ width: 120 }}
                  loading={platformLoading}
                >
                  {platforms.map(p => (
                    <Select.Option key={p} value={p}>
                      {PLATFORM_NAMES[p]}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* 达人选择器 */}
              <div className="flex-1 min-w-[300px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  选择达人（最多5个）
                </label>
                <TalentSelector
                  platform={selectedPlatform}
                  selectedTalents={selectedTalents}
                  onSelect={handleTalentSelect}
                  onRemove={handleTalentRemove}
                  maxCount={5}
                />
              </div>

              {/* 时间范围 */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  时间范围
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={timePreset}
                    onChange={setTimePreset}
                    style={{ width: 110 }}
                  >
                    {TIME_PRESETS.map(preset => (
                      <Select.Option key={preset.days} value={preset.days}>
                        {preset.label}
                      </Select.Option>
                    ))}
                  </Select>
                  {timePreset === 0 && (
                    <RangePicker
                      value={customRange}
                      onChange={dates =>
                        setCustomRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
                      }
                      allowClear={false}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 第二行：指标选择（根据达人数量动态切换） */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-medium text-gray-600">
                  选择指标
                </label>
                <Tooltip
                  title={
                    isSingleTalentMode
                      ? '单达人模式：可选择1-2个指标进行双轴对比'
                      : '多达人模式：选择1个指标进行达人对比'
                  }
                >
                  <InfoCircleOutlined className="text-gray-400 text-xs cursor-help" />
                </Tooltip>
                {isSingleTalentMode && (
                  <Tag color="blue" className="text-xs">
                    可选2个指标
                  </Tag>
                )}
              </div>
              {/* 单达人模式：Checkbox 多选（最多2个） */}
              {isSingleTalentMode ? (
                <Checkbox.Group
                  value={selectedMetrics}
                  onChange={checkedValues => {
                    // 最多选择2个指标
                    if (checkedValues.length <= 2) {
                      setSelectedMetrics(checkedValues as string[]);
                    }
                  }}
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {METRIC_OPTIONS.map(metric => (
                      <Checkbox
                        key={metric.key}
                        value={metric.key}
                        disabled={
                          selectedMetrics.length >= 2 &&
                          !selectedMetrics.includes(metric.key)
                        }
                      >
                        <span className="text-sm">{metric.label}</span>
                        {metric.unit && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({metric.unit})
                          </span>
                        )}
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              ) : (
                /* 多达人模式：Radio 单选 */
                <Radio.Group
                  value={selectedMetrics[0]}
                  onChange={e => setSelectedMetrics([e.target.value])}
                >
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {METRIC_OPTIONS.map(metric => (
                      <Radio key={metric.key} value={metric.key}>
                        <span className="text-sm">{metric.label}</span>
                        {metric.unit && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({metric.unit})
                          </span>
                        )}
                      </Radio>
                    ))}
                  </div>
                </Radio.Group>
              )}
            </div>
          </div>
        </ProCard>

        {/* 已选达人标签 */}
        {selectedTalents.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">已选达人：</span>
            {selectedTalents.map(talent => (
              <Tag
                key={talent.oneId}
                closable
                onClose={() => handleTalentRemove(talent.oneId)}
                color="blue"
              >
                {talent.name}
              </Tag>
            ))}
          </div>
        )}

        {/* 图表区域 - 使用 ProCard */}
        <ProCard
          title={
            <div className="flex items-center gap-3">
              <span className="font-medium">趋势图表</span>
              {selectedTalents.length > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500">
                    已选 {selectedTalents.length} 个达人
                    {useDualAxes && ' · 双轴对比模式'}
                  </span>
                </>
              )}
            </div>
          }
          className="border border-gray-200"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Spin size="large" tip="加载数据中..." />
            </div>
          ) : selectedTalents.length === 0 ? (
            <Empty
              description="请选择要分析的达人"
              className="py-20"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : chartData.length === 0 ? (
            <Empty
              description="暂无数据"
              className="py-20"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : useDualAxes && dualAxesConfig ? (
            /* 单达人双指标：双轴图 */
            <div className="h-96">
              <DualAxes {...dualAxesConfig} />
            </div>
          ) : lineChartConfig ? (
            /* 多达人单指标：折线图 */
            <div className="h-96">
              <Line {...lineChartConfig} />
            </div>
          ) : null}
        </ProCard>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            加载数据失败：{error}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
