/**
 * 达人趋势 Tab
 * 展示达人历史 CPM/播放量 趋势图表
 *
 * 功能：
 * - 单达人模式：支持双指标（CPM + 播放量）双轴图
 * - 多达人模式：单指标对比，按达人区分颜色
 *
 * v2.0：
 * - 后端只返回原始数据（totalViews）
 * - CPM 由前端计算：revenue / totalViews × 1000
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Select, Empty, Spin, message, Checkbox, Radio } from 'antd';
import { Line, DualAxes } from '@ant-design/charts';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getTalentTrend } from '../../../../api/dailyReport';
import type {
  DailyReportDetail,
  TalentTrendDataRaw,
  TalentTrendData,
  TrendDataPoint,
} from '../../../../types/dailyReport';
import { formatViews, calculateCPM } from '../../../../types/dailyReport';
// 定价模式类型（本地定义，避免循环依赖）
type PricingMode = 'framework' | 'project';

interface TalentTrendTabProps {
  details: DailyReportDetail[];
  benchmarkCPM?: number;
  loading?: boolean;
  /** 平台报价系数（用于计算收入和 CPM） */
  platformQuotationCoefficients?: Record<string, number>;
}

// 指标配置
const METRIC_OPTIONS = [
  {
    key: 'cpm',
    label: 'CPM',
    unit: '元',
    format: (v: number) => `¥${v.toFixed(2)}`,
  },
  { key: 'totalViews', label: '播放量', unit: '万', format: formatViews },
];

// 达人颜色配置（最多10个达人）
const TALENT_COLORS = [
  '#4f46e5', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo-500
];

// 指标颜色（用于双轴图）
const METRIC_COLORS = ['#4f46e5', '#10b981'];

/**
 * 根据主题返回图表主题名称
 */
function useChartTheme(): string | undefined {
  const { isDark } = useTheme();
  return isDark ? 'classicDark' : undefined;
}

/**
 * 计算单条合作记录的收入（与 useDailyReportData.ts 一致）
 */
function calculateRevenue(
  item: {
    amount: number;
    pricingMode: PricingMode;
    quotationPrice: number | null;
    talentPlatform: string;
  },
  platformQuotationCoefficients: Record<string, number>
): number {
  if (item.pricingMode === 'project' && item.quotationPrice) {
    // 比价模式：使用对客报价
    return item.quotationPrice;
  }
  // 框架模式：刊例价 × 报价系数
  const coefficient = platformQuotationCoefficients[item.talentPlatform] || 1;
  return Math.round(item.amount * coefficient);
}

/**
 * 处理后端返回的趋势原始数据，计算 CPM
 */
function processTrendRawData(
  rawDataList: TalentTrendDataRaw[],
  platformQuotationCoefficients: Record<string, number>
): TalentTrendData[] {
  return rawDataList.map(raw => {
    // 1. 计算该合作的收入
    const revenue = calculateRevenue(raw, platformQuotationCoefficients);

    // 2. 为每个数据点计算 CPM
    const dataWithCPM: TrendDataPoint[] = raw.data.map(point => ({
      date: point.date,
      totalViews: point.totalViews,
      cpm: calculateCPM(revenue, point.totalViews),
    }));

    return {
      collaborationId: raw.collaborationId,
      talentName: raw.talentName,
      revenue,
      data: dataWithCPM,
    };
  });
}

export function TalentTrendTab({
  details,
  benchmarkCPM = 30,
  loading = false,
  platformQuotationCoefficients = {},
}: TalentTrendTabProps) {
  const chartTheme = useChartTheme();
  const [selectedTalents, setSelectedTalents] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TalentTrendData[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  // 指标选择：单达人时可多选，多达人时单选
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['cpm']);

  // 是否为单达人模式
  const isSingleTalentMode = selectedTalents.length === 1;

  // 多达人模式时只保留第一个指标
  useEffect(() => {
    if (!isSingleTalentMode && selectedMetrics.length > 1) {
      setSelectedMetrics([selectedMetrics[0]]);
    }
  }, [isSingleTalentMode, selectedMetrics]);

  // 达人选项（只显示有日报数据的达人）
  const talentOptions = useMemo(() => {
    return details.map(d => ({
      value: d.collaborationId,
      label: d.talentName,
    }));
  }, [details]);

  // 处理达人选择
  const handleTalentChange = useCallback(
    async (values: string[]) => {
      setSelectedTalents(values);

      if (values.length === 0) {
        setTrendData([]);
        return;
      }

      setTrendLoading(true);
      try {
        // 获取原始数据（不含 CPM）
        const rawData = await getTalentTrend({
          collaborationIds: values,
          days: 14,
        });
        // 前端计算 CPM
        const processedData = processTrendRawData(
          rawData,
          platformQuotationCoefficients
        );
        setTrendData(processedData);
      } catch (error) {
        console.error('获取趋势数据失败:', error);
        message.error('获取趋势数据失败');
        setTrendData([]);
      } finally {
        setTrendLoading(false);
      }
    },
    [platformQuotationCoefficients]
  );

  // 处理指标选择
  const handleMetricChange = (values: string[]) => {
    if (values.length === 0) return; // 至少选一个
    if (!isSingleTalentMode) {
      // 多达人模式：单选
      setSelectedMetrics([values[values.length - 1]]);
    } else {
      // 单达人模式：最多选2个
      setSelectedMetrics(values.slice(-2));
    }
  };

  // 获取选中达人的名称列表
  const selectedTalentNames = useMemo(() => {
    return selectedTalents.map(id => {
      const detail = details.find(d => d.collaborationId === id);
      return detail?.talentName || id;
    });
  }, [selectedTalents, details]);

  // 转换数据为图表格式（含环比变化）
  const { lineChartData, dualAxesData } = useMemo(() => {
    if (trendData.length === 0) {
      return { lineChartData: [], dualAxesData: [] };
    }

    // 单达人双指标模式 - DualAxes 数据
    if (isSingleTalentMode && selectedMetrics.length === 2) {
      const talent = trendData[0];
      const dualData = talent.data.map((point, index) => {
        const prevPoint = index > 0 ? talent.data[index - 1] : null;
        const cpmChange = prevPoint ? point.cpm - prevPoint.cpm : null;
        const viewsChange = prevPoint
          ? (point.totalViews - prevPoint.totalViews) / 10000
          : null;
        return {
          date: point.date,
          cpm: point.cpm,
          totalViews: point.totalViews / 10000, // 转为万
          cpmChange,
          viewsChange,
        };
      });
      return { lineChartData: [], dualAxesData: dualData };
    }

    // 多达人或单指标模式 - Line 数据
    const metric = selectedMetrics[0];
    const lineData: Array<{
      date: string;
      value: number;
      talent: string;
      change: number | null;
    }> = [];

    trendData.forEach(talent => {
      talent.data.forEach((point, index) => {
        let value = metric === 'cpm' ? point.cpm : point.totalViews;
        let prevValue =
          index > 0
            ? metric === 'cpm'
              ? talent.data[index - 1].cpm
              : talent.data[index - 1].totalViews
            : null;

        // 播放量转为万
        if (metric === 'totalViews') {
          if (value > 10000) value = value / 10000;
          if (prevValue && prevValue > 10000) prevValue = prevValue / 10000;
        }

        const change = prevValue !== null ? value - prevValue : null;

        lineData.push({
          date: point.date,
          value,
          talent: talent.talentName,
          change,
        });
      });
    });

    return { lineChartData: lineData, dualAxesData: [] };
  }, [trendData, selectedMetrics, isSingleTalentMode]);

  // 获取当前指标配置
  const currentMetricConfig = useMemo(() => {
    return METRIC_OPTIONS.find(m => m.key === selectedMetrics[0]);
  }, [selectedMetrics]);

  // Line 图表配置（多达人或单指标）
  const lineChartConfig = useMemo(() => {
    if (lineChartData.length === 0) return null;
    if (isSingleTalentMode && selectedMetrics.length === 2) return null;

    const colors = selectedTalentNames.map(
      (_, i) => TALENT_COLORS[i % TALENT_COLORS.length]
    );

    const yAxisTitle = currentMetricConfig
      ? `${currentMetricConfig.label}${currentMetricConfig.unit ? ` (${currentMetricConfig.unit})` : ''}`
      : '';

    const isCPM = selectedMetrics[0] === 'cpm';

    return {
      data: lineChartData,
      xField: 'date',
      yField: 'value',
      colorField: 'talent',
      shapeField: 'smooth',
      theme: chartTheme,
      scale: {
        color: {
          domain: selectedTalentNames,
          range: colors,
        },
      },
      legend: {
        color: {
          position: 'top' as const,
          itemMarker: 'smooth',
        },
      },
      axis: {
        x: { tickCount: 8 },
        y: { title: yAxisTitle, min: 0 },
      },
      style: { lineWidth: 2 },
      point: { size: 4, shape: 'circle' },
      tooltip: {
        title: 'date',
        items: [{ channel: 'y', name: 'talent' }],
      },
      interaction: {
        tooltip: {
          render: (
            _: unknown,
            tooltipData: {
              title: string;
              items: Array<{ name: string; value: number; color: string }>;
            }
          ) => {
            const { title, items } = tooltipData;
            // 根据 date 和 talent 从原始数据中找到完整数据点
            const getDataPoint = (talentName: string) => {
              return lineChartData.find(
                d => d.date === title && d.talent === talentName
              );
            };
            return `<div style="padding: 8px 12px;">
              <div style="margin-bottom: 8px; color: rgba(255,255,255,0.65);">${title}</div>
              ${items
                .map(item => {
                  const dataPoint = getDataPoint(item.name);
                  const value = dataPoint?.value ?? item.value;
                  const formattedValue = isCPM
                    ? `¥${value.toFixed(2)}`
                    : `${value.toFixed(1)}万`;
                  let changeText = '';
                  if (
                    dataPoint?.change !== undefined &&
                    dataPoint.change !== null
                  ) {
                    const sign = dataPoint.change >= 0 ? '+' : '';
                    changeText = isCPM
                      ? ` (${sign}¥${dataPoint.change.toFixed(2)})`
                      : ` (${sign}${dataPoint.change.toFixed(1)}万)`;
                  }
                  return `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
                  <span style="color: rgba(255,255,255,0.85);">${item.name}</span>
                  <span style="color: #fff; margin-left: auto;">${formattedValue}${changeText}</span>
                </div>`;
                })
                .join('')}
            </div>`;
          },
        },
      },
      // CPM 基准线
      ...(isCPM && {
        annotations: [
          {
            type: 'lineY' as const,
            yField: benchmarkCPM,
            style: {
              stroke: '#ff4d4f',
              lineDash: [4, 4],
              lineWidth: 1,
            },
            label: {
              text: `基准 ¥${benchmarkCPM}`,
              position: 'left' as const,
              style: { fill: '#ff4d4f', fontSize: 10 },
              dy: -8,
            },
          },
        ],
      }),
    };
  }, [
    lineChartData,
    selectedTalentNames,
    benchmarkCPM,
    chartTheme,
    currentMetricConfig,
    selectedMetrics,
    isSingleTalentMode,
  ]);

  // DualAxes 图表配置（单达人双指标）
  const dualAxesConfig = useMemo(() => {
    if (dualAxesData.length === 0) return null;
    if (!isSingleTalentMode || selectedMetrics.length !== 2) return null;

    return {
      data: dualAxesData,
      xField: 'date',
      theme: chartTheme,
      legend: false,
      axis: { y: false },
      interaction: {
        tooltip: {
          render: (
            _: unknown,
            tooltipData: {
              title: string;
              items: Array<{ name: string; value: number; color: string }>;
            }
          ) => {
            const { title, items } = tooltipData;
            const dataPoint = dualAxesData.find(d => d.date === title);

            return `<div style="padding: 8px 12px;">
              <div style="margin-bottom: 8px; color: rgba(255,255,255,0.65);">${title}</div>
              ${items
                .map(item => {
                  const isCpm = item.name === 'cpm';
                  const value = item.value;
                  const change = isCpm
                    ? dataPoint?.cpmChange
                    : dataPoint?.viewsChange;
                  const formattedValue = isCpm
                    ? `¥${value.toFixed(2)}`
                    : `${value.toFixed(1)}万`;
                  let changeText = '';
                  if (change !== undefined && change !== null) {
                    const sign = change >= 0 ? '+' : '';
                    changeText = isCpm
                      ? ` (${sign}¥${change.toFixed(2)})`
                      : ` (${sign}${change.toFixed(1)}万)`;
                  }
                  const displayName = isCpm ? 'CPM' : '播放量';
                  return `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
                  <span style="color: rgba(255,255,255,0.85);">${displayName}</span>
                  <span style="color: #fff; margin-left: auto;">${formattedValue}${changeText}</span>
                </div>`;
                })
                .join('')}
            </div>`;
          },
        },
      },
      children: [
        {
          type: 'line' as const,
          yField: 'cpm',
          shapeField: 'smooth',
          style: { stroke: METRIC_COLORS[0], lineWidth: 2 },
          axis: {
            y: {
              position: 'left' as const,
              title: 'CPM (元)',
              titleFill: METRIC_COLORS[0],
            },
          },
        },
        {
          type: 'point' as const,
          yField: 'cpm',
          style: { fill: METRIC_COLORS[0], r: 3 },
          tooltip: false,
          axis: { y: false },
        },
        {
          type: 'line' as const,
          yField: 'totalViews',
          shapeField: 'smooth',
          style: { stroke: METRIC_COLORS[1], lineWidth: 2 },
          axis: {
            y: {
              position: 'right' as const,
              title: '播放量 (万)',
              titleFill: METRIC_COLORS[1],
            },
          },
        },
        {
          type: 'point' as const,
          yField: 'totalViews',
          style: { fill: METRIC_COLORS[1], r: 3 },
          tooltip: false,
          axis: { y: false },
        },
      ],
    };
  }, [dualAxesData, isSingleTalentMode, selectedMetrics, chartTheme]);

  // 判断使用哪种图表
  const useDualAxes = isSingleTalentMode && selectedMetrics.length === 2;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* 控制栏 */}
      <div className="flex flex-wrap items-center gap-6">
        {/* 达人选择器 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--aw-gray-500)]">选择达人:</span>
          <Select
            mode="multiple"
            value={selectedTalents}
            onChange={handleTalentChange}
            options={talentOptions}
            placeholder="选择要对比的达人"
            style={{ minWidth: 280 }}
            maxTagCount={3}
            maxCount={10}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* 指标选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--aw-gray-500)]">指标:</span>
          {isSingleTalentMode ? (
            <Checkbox.Group
              value={selectedMetrics}
              onChange={
                handleMetricChange as (
                  values: (string | number | boolean)[]
                ) => void
              }
              options={METRIC_OPTIONS.map(m => ({
                label: m.label,
                value: m.key,
              }))}
            />
          ) : (
            <Radio.Group
              value={selectedMetrics[0]}
              onChange={e => setSelectedMetrics([e.target.value])}
              options={METRIC_OPTIONS.map(m => ({
                label: m.label,
                value: m.key,
              }))}
              optionType="button"
              buttonStyle="solid"
              size="small"
            />
          )}
        </div>

        {/* 模式提示 */}
        {selectedTalents.length > 0 && (
          <span className="text-xs text-[var(--aw-gray-400)]">
            {isSingleTalentMode
              ? '单达人模式：可选双指标'
              : `多达人对比模式（${selectedTalents.length}人）`}
          </span>
        )}
      </div>

      {/* 图表区域 */}
      <div className="rounded-lg border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] p-4">
        {selectedTalents.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择达人查看趋势"
          />
        ) : trendLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spin size="large" />
          </div>
        ) : lineChartData.length === 0 && dualAxesData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无趋势数据"
          />
        ) : useDualAxes && dualAxesConfig ? (
          <div style={{ height: 400 }}>
            <DualAxes {...dualAxesConfig} />
          </div>
        ) : lineChartConfig ? (
          <div style={{ height: 400 }}>
            <Line {...lineChartConfig} />
          </div>
        ) : null}
      </div>

      {/* 图例说明（双轴图模式） */}
      {useDualAxes && dualAxesData.length > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: METRIC_COLORS[0] }}
            />
            <span className="text-[var(--aw-gray-600)]">CPM (左轴)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: METRIC_COLORS[1] }}
            />
            <span className="text-[var(--aw-gray-600)]">播放量 (右轴)</span>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="text-xs text-[var(--aw-gray-400)] space-y-1">
        {selectedMetrics.includes('cpm') && (
          <p>* 红色虚线为基准 CPM (¥{benchmarkCPM})，低于基准表示效果达标</p>
        )}
        <p>* 单达人时可同时查看 CPM 和播放量双指标</p>
        <p>* 图表显示最近 14 天的数据</p>
      </div>
    </div>
  );
}
