/**
 * 效果验收 Tab
 * 展示项目效果数据，支持根据客户配置动态渲染指标列和数据周期
 *
 * @version 3.0.0
 * @changelog
 * - v3.0.0 (2025-12-11): 全新 UI 设计，专业数据看板风格
 * - v2.0.0 (2025-12-11): 实现动态指标列渲染，根据 effectConfig 配置
 * - v1.0.0: 初始版本，硬编码指标列
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Tag,
  Progress,
  Tabs,
  InputNumber,
  Button,
  App,
  Empty,
} from 'antd';
import {
  PlayCircleOutlined,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  SaveOutlined,
  DollarOutlined,
  LineChartOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { Collaboration, EffectMetrics } from '../../../types/project';
import { formatMoney, centsToYuan } from '../../../types/project';
import type { Platform } from '../../../types/talent';
import type { EffectTabConfig, EffectPeriod } from '../../../types/projectConfig';
import {
  AVAILABLE_EFFECT_METRICS,
  EFFECT_PERIOD_OPTIONS,
  DEFAULT_PROJECT_CONFIG,
} from '../../../types/projectConfig';
import { projectApi } from '../../../services/projectApi';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

// 注入自定义样式
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.2);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .effect-tab-container {
    --metric-blue: #3b82f6;
    --metric-pink: #ec4899;
    --metric-purple: #8b5cf6;
    --metric-cyan: #06b6d4;
    --metric-orange: #f97316;
    --metric-green: #10b981;
    --metric-red: #ef4444;
    --metric-indigo: #6366f1;
    --metric-amber: #f59e0b;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  @media (max-width: 1024px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .metrics-grid.cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  .metrics-grid.cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 1024px) {
    .metrics-grid.cols-3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .metric-card {
    position: relative;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.02),
      0 4px 12px rgba(0, 0, 0, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    animation: fadeInUp 0.5s ease-out backwards;
    min-height: 100px;
  }

  .metric-card-inner {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 100%;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent-color, #3b82f6);
    border-radius: 16px 16px 0 0;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.04),
      0 12px 24px rgba(0, 0, 0, 0.08);
  }

  .metric-card.plays { --accent-color: var(--metric-blue); }
  .metric-card.likes { --accent-color: var(--metric-pink); }
  .metric-card.comments { --accent-color: var(--metric-purple); }
  .metric-card.shares { --accent-color: var(--metric-cyan); }
  .metric-card.gmv { --accent-color: var(--metric-red); }
  .metric-card.conversions { --accent-color: var(--metric-amber); }
  .metric-card.progress { --accent-color: var(--metric-indigo); }
  .metric-card.cpm { --accent-color: var(--metric-orange); }
  .metric-card.roi { --accent-color: var(--metric-green); }

  .metric-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
    flex-shrink: 0;
    background: var(--accent-color, #3b82f6);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color) 30%, transparent);
  }

  .metric-value {
    font-size: 28px;
    font-weight: 700;
    font-feature-settings: 'tnum' on, 'lnum' on;
    letter-spacing: -0.02em;
    color: #0f172a;
    line-height: 1.1;
  }

  .metric-label {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .metric-benchmark {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }

  .progress-ring {
    position: relative;
    width: 72px;
    height: 72px;
    flex-shrink: 0;
  }

  .progress-ring .ant-progress-text {
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #0f172a !important;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .status-badge.success {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #047857;
  }

  .status-badge.warning {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #b45309;
  }

  .period-tabs .ant-tabs-nav {
    margin-bottom: 0 !important;
  }

  .period-tabs .ant-tabs-tab {
    padding: 10px 20px !important;
    font-weight: 500;
    border-radius: 10px 10px 0 0 !important;
    transition: all 0.2s ease;
  }

  .period-tabs .ant-tabs-tab-active {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  }

  .period-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: white !important;
  }

  .data-table-wrapper {
    background: white;
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    animation: fadeInUp 0.6s ease-out 0.3s backwards;
  }

  .data-table-wrapper .ant-pro-table-list-toolbar {
    padding: 16px 20px !important;
    border-bottom: 1px solid #f1f5f9;
  }

  .data-table-wrapper .ant-pro-table-list-toolbar-title {
    font-weight: 600;
    color: #0f172a;
  }

  .empty-state {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    padding: 48px;
    text-align: center;
    animation: fadeInUp 0.5s ease-out backwards;
  }

  .empty-state-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #94a3b8;
  }
`;

/**
 * 效果汇总统计
 */
interface EffectSummary {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalGmv: number;
  totalConversions: number;
  avgCpm: number;
  avgCpe: number;
  avgRoi: number;
  recordedCount: number;
  totalCount: number;
}

interface EffectTabProps {
  projectId: string;
  platforms: Platform[];
  benchmarkCPM?: number;
  /** 客户自定义效果配置 */
  effectConfig?: EffectTabConfig;
  onRefresh?: () => void;
}

/**
 * 指标图标映射
 */
const METRIC_ICONS: Record<string, React.ReactNode> = {
  plays: <PlayCircleOutlined />,
  likes: <LikeOutlined />,
  comments: <MessageOutlined />,
  shares: <ShareAltOutlined />,
  cpm: <DollarOutlined />,
  cpe: <DollarOutlined />,
  gmv: <ShoppingCartOutlined />,
  roi: <RiseOutlined />,
  conversions: <LineChartOutlined />,
};

export function EffectTab({
  projectId,
  platforms: _platforms,
  benchmarkCPM,
  effectConfig,
  onRefresh,
}: EffectTabProps) {
  void _platforms;
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 调试：输出接收到的配置
  logger.debug('[EffectTab] Received effectConfig:', effectConfig);

  // 使用配置或默认值
  const config = effectConfig || DEFAULT_PROJECT_CONFIG.effectConfig!;
  const enabledPeriods = config.enabledPeriods || ['t7', 't21'];
  const enabledMetrics = config.enabledMetrics || [
    'plays',
    'likes',
    'comments',
    'shares',
    'cpm',
  ];
  const benchmarks = config.benchmarks || {};

  // 调试：输出解析后的配置
  logger.debug('[EffectTab] Parsed config:', {
    enabledPeriods,
    enabledMetrics,
    benchmarks,
  });

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [period, setPeriod] = useState<EffectPeriod>(enabledPeriods[0] || 't7');
  const [summary, setSummary] = useState<EffectSummary>({
    totalPlays: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalGmv: 0,
    totalConversions: 0,
    avgCpm: 0,
    avgCpe: 0,
    avgRoi: 0,
    recordedCount: 0,
    totalCount: 0,
  });

  // 编辑状态
  const [editingData, setEditingData] = useState<
    Record<string, Partial<EffectMetrics>>
  >({});

  /**
   * 计算汇总统计
   */
  const calculateSummary = (
    data: Collaboration[],
    currentPeriod: EffectPeriod
  ): EffectSummary => {
    let totalPlays = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalGmv = 0;
    let totalConversions = 0;
    let totalCpm = 0;
    let totalCpe = 0;
    let totalRoi = 0;
    let totalAmount = 0;
    let recordedCount = 0;
    let cpmCount = 0;
    let cpeCount = 0;
    let roiCount = 0;

    data.forEach(c => {
      const metrics = c.effectData?.[currentPeriod];
      if (metrics) {
        recordedCount++;
        totalPlays += metrics.plays || 0;
        totalLikes += metrics.likes || 0;
        totalComments += metrics.comments || 0;
        totalShares += metrics.shares || 0;
        totalGmv += metrics.gmv || 0;
        totalConversions += metrics.conversions || 0;

        if (metrics.cpm && metrics.cpm > 0) {
          totalCpm += metrics.cpm;
          cpmCount++;
        }
        if (metrics.cpe && metrics.cpe > 0) {
          totalCpe += metrics.cpe;
          cpeCount++;
        }
        if (metrics.roi && metrics.roi > 0) {
          totalRoi += metrics.roi;
          roiCount++;
        }

        totalAmount += c.amount;
      }
    });

    const totalInteractions = totalLikes + totalComments + totalShares;
    const avgCpm = cpmCount > 0 ? totalCpm / cpmCount : 0;
    const avgCpe =
      cpeCount > 0
        ? totalCpe / cpeCount
        : totalInteractions > 0
          ? centsToYuan(totalAmount) / totalInteractions
          : 0;
    const avgRoi = roiCount > 0 ? totalRoi / roiCount : 0;

    return {
      totalPlays,
      totalLikes,
      totalComments,
      totalShares,
      totalGmv,
      totalConversions,
      avgCpm,
      avgCpe,
      avgRoi,
      recordedCount,
      totalCount: data.filter(c => c.status === '视频已发布').length,
    };
  };

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500,
        status: '视频已发布',
      });

      if (response.success) {
        setCollaborations(response.data.items);
        setSummary(calculateSummary(response.data.items, period));
      } else {
        setCollaborations([]);
        message.error('获取效果数据失败');
      }
    } catch (error) {
      logger.error('Error loading effect data:', error);
      message.error('获取效果数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, period, message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 切换时间维度
   */
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod as EffectPeriod);
    setSummary(calculateSummary(collaborations, newPeriod as EffectPeriod));
    setEditingData({});
  };

  /**
   * 更新编辑数据
   */
  const handleEditChange = (
    id: string,
    field: keyof EffectMetrics,
    value: number | null
  ) => {
    setEditingData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value ?? undefined,
      },
    }));
  };

  /**
   * 保存单条效果数据
   */
  const handleSaveEffect = async (id: string) => {
    const editing = editingData[id];
    if (!editing) return;

    const collaboration = collaborations.find(c => c.id === id);
    if (!collaboration) return;

    try {
      const plays =
        editing.plays ?? collaboration.effectData?.[period]?.plays ?? 0;
      const amount = collaboration.amount;
      const cpm = plays > 0 ? (centsToYuan(amount) / plays) * 1000 : 0;

      const updatedEffectData = {
        ...collaboration.effectData,
        [period]: {
          ...collaboration.effectData?.[period],
          ...editing,
          cpm: Math.round(cpm * 100) / 100,
          recordedAt: new Date().toISOString(),
        },
      };

      const response = await projectApi.updateCollaboration(id, {
        effectData: updatedEffectData,
      });

      if (response.success) {
        message.success('保存成功');
        setEditingData(prev => {
          const newData = { ...prev };
          delete newData[id];
          return newData;
        });
        loadCollaborations();
        onRefresh?.();
      } else {
        message.error('保存失败');
      }
    } catch {
      message.error('保存失败');
    }
  };

  /**
   * 格式化大数字
   */
  const formatNumber = (num: number): string => {
    if (num >= 100000000) {
      return `${(num / 100000000).toFixed(1)}亿`;
    }
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  /**
   * 获取指标的当前值或编辑值
   */
  const getMetricValue = (
    record: Collaboration,
    metricKey: string
  ): number | undefined => {
    const editValue = editingData[record.id]?.[metricKey as keyof EffectMetrics];
    if (editValue !== undefined) return editValue as number;
    return record.effectData?.[period]?.[
      metricKey as keyof EffectMetrics
    ] as number | undefined;
  };

  /**
   * 生成动态列
   */
  const generateDynamicColumns = (): ProColumns<Collaboration>[] => {
    const columns: ProColumns<Collaboration>[] = [
      {
        title: '达人昵称',
        dataIndex: 'talentName',
        width: 200,
        fixed: 'left',
        ellipsis: true,
        render: (_, record) => (
          <TalentNameWithLinks {...fromCollaboration(record)} />
        ),
      },
      {
        title: '平台',
        dataIndex: 'talentPlatform',
        width: 90,
        render: (_, record) => (
          <Tag color={platformColors[record.talentPlatform] || 'default'}>
            {platformNames[record.talentPlatform] || record.talentPlatform}
          </Tag>
        ),
      },
      {
        title: '执行金额',
        dataIndex: 'amount',
        width: 100,
        render: (_, record) => (
          <span className="text-gray-600">{formatMoney(record.amount)}</span>
        ),
      },
    ];

    // 根据 enabledMetrics 动态添加指标列
    enabledMetrics.forEach(metricKey => {
      const metricConfig = AVAILABLE_EFFECT_METRICS.find(
        m => m.key === metricKey
      );
      if (!metricConfig) return;

      // CPM 列特殊处理（只读，自动计算）
      if (metricKey === 'cpm') {
        columns.push({
          title: metricConfig.label,
          dataIndex: ['effectData', period, 'cpm'],
          width: 80,
          render: (_, record) => {
            const cpm = record.effectData?.[period]?.cpm;
            if (!cpm) return <span className="text-gray-300">-</span>;

            const benchmark = benchmarks.cpm ?? benchmarkCPM;
            const isGood = benchmark ? cpm <= benchmark : true;
            return (
              <span
                className={`font-medium ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}
              >
                {cpm.toFixed(2)}
              </span>
            );
          },
        });
        return;
      }

      // CPE 列（只读）
      if (metricKey === 'cpe') {
        columns.push({
          title: metricConfig.label,
          dataIndex: ['effectData', period, 'cpe'],
          width: 80,
          render: (_, record) => {
            const cpe = record.effectData?.[period]?.cpe;
            if (!cpe) return <span className="text-gray-300">-</span>;

            const benchmark = benchmarks.cpe;
            const isGood = benchmark ? cpe <= benchmark : true;
            return (
              <span
                className={`font-medium ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}
              >
                {cpe.toFixed(2)}
              </span>
            );
          },
        });
        return;
      }

      // ROI 列（只读）
      if (metricKey === 'roi') {
        columns.push({
          title: metricConfig.label,
          dataIndex: ['effectData', period, 'roi'],
          width: 80,
          render: (_, record) => {
            const roi = record.effectData?.[period]?.roi;
            if (!roi) return <span className="text-gray-300">-</span>;

            const benchmark = benchmarks.roi;
            const isGood = benchmark ? roi >= benchmark : true;
            return (
              <span
                className={`font-medium ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}
              >
                {roi.toFixed(2)}%
              </span>
            );
          },
        });
        return;
      }

      // GMV 列（可编辑）
      if (metricKey === 'gmv') {
        columns.push({
          title: metricConfig.label,
          dataIndex: ['effectData', period, 'gmv'],
          width: 120,
          render: (_, record) => {
            const current = getMetricValue(record, 'gmv');
            return (
              <InputNumber
                value={current}
                onChange={v => handleEditChange(record.id, 'gmv', v)}
                placeholder="输入"
                size="small"
                style={{ width: 100 }}
                prefix="¥"
                formatter={v =>
                  `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={v => Number(v?.replace(/[¥,]/g, '') || 0)}
              />
            );
          },
        });
        return;
      }

      // 其他可编辑指标（播放量、点赞数、评论数、转发数、转化数）
      columns.push({
        title: metricConfig.label,
        dataIndex: ['effectData', period, metricKey],
        width: metricKey === 'plays' ? 120 : 100,
        render: (_, record) => {
          const current = getMetricValue(record, metricKey);
          return (
            <InputNumber
              value={current}
              onChange={v =>
                handleEditChange(record.id, metricKey as keyof EffectMetrics, v)
              }
              placeholder="输入"
              size="small"
              style={{ width: metricKey === 'plays' ? 100 : 80 }}
              formatter={
                metricKey === 'plays'
                  ? v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  : undefined
              }
              parser={
                metricKey === 'plays'
                  ? v => Number(v?.replace(/,/g, '') || 0)
                  : undefined
              }
            />
          );
        },
      });
    });

    // 操作列
    columns.push({
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const hasEditing = editingData[record.id];
        return hasEditing ? (
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={() => handleSaveEffect(record.id)}
          >
            保存
          </Button>
        ) : null;
      },
    });

    return columns;
  };

  /**
   * 获取统计值
   */
  const getSummaryValue = (metricKey: string): number => {
    switch (metricKey) {
      case 'plays':
        return summary.totalPlays;
      case 'likes':
        return summary.totalLikes;
      case 'comments':
        return summary.totalComments;
      case 'shares':
        return summary.totalShares;
      case 'gmv':
        return summary.totalGmv;
      case 'conversions':
        return summary.totalConversions;
      case 'cpm':
        return summary.avgCpm;
      case 'cpe':
        return summary.avgCpe;
      case 'roi':
        return summary.avgRoi;
      default:
        return 0;
    }
  };

  // 生成周期 Tab 项
  const periodTabItems = enabledPeriods.map(p => {
    const periodConfig = EFFECT_PERIOD_OPTIONS.find(opt => opt.key === p);
    return {
      key: p,
      label: periodConfig?.label || p,
    };
  });

  // 过滤出用于统计卡片显示的指标（排除 cpm、cpe、roi）
  const statsMetrics = enabledMetrics.filter(
    m => !['cpm', 'cpe', 'roi'].includes(m)
  );

  // 录入进度
  const recordProgress =
    summary.totalCount > 0
      ? Math.round((summary.recordedCount / summary.totalCount) * 100)
      : 0;

  // CPM 达成率
  const cpmBenchmark = benchmarks.cpm ?? benchmarkCPM;
  const cpmAchievement =
    cpmBenchmark && summary.avgCpm > 0
      ? Math.round((cpmBenchmark / summary.avgCpm) * 100)
      : 0;

  const columns = useMemo(
    () => generateDynamicColumns(),
    [
      enabledMetrics,
      period,
      platformColors,
      platformNames,
      editingData,
      benchmarks,
      benchmarkCPM,
    ]
  );

  // 计算显示的卡片数量，确定布局
  const totalCards =
    statsMetrics.length +
    1 + // 录入进度
    (enabledMetrics.includes('cpm') ? 1 : 0) +
    (enabledMetrics.includes('cpm') && cpmBenchmark ? 1 : 0) +
    (enabledMetrics.includes('roi') ? 1 : 0);

  // 根据卡片数量计算 grid 列数 class
  const getGridColsClass = () => {
    if (totalCards <= 2) return 'cols-2';
    if (totalCards <= 3) return 'cols-3';
    return ''; // 默认 4 列
  };

  const gridColsClass = getGridColsClass();

  return (
    <>
      <style>{customStyles}</style>
      <div className="effect-tab-container space-y-6">
        {/* 时间维度切换 */}
        <div className="period-tabs">
          <Tabs
            activeKey={period}
            onChange={handlePeriodChange}
            items={periodTabItems}
            type="card"
          />
        </div>

        {/* 效果看板 - CSS Grid 布局确保等高 */}
        <div className={`metrics-grid ${gridColsClass}`}>
          {/* 基础数据指标卡片 */}
          {statsMetrics.map((metricKey, index) => {
            const metricConfig = AVAILABLE_EFFECT_METRICS.find(
              m => m.key === metricKey
            );
            if (!metricConfig) return null;

            return (
              <div
                key={metricKey}
                className={`metric-card ${metricKey}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="metric-card-inner">
                  <div className="metric-icon">{METRIC_ICONS[metricKey]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="metric-label">总{metricConfig.label}</div>
                    <div className="metric-value">
                      {formatNumber(getSummaryValue(metricKey))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 录入进度 */}
          <div
            className="metric-card progress"
            style={{ animationDelay: `${statsMetrics.length * 0.1}s` }}
          >
            <div className="metric-card-inner">
              <div className="progress-ring">
                <Progress
                  type="circle"
                  percent={recordProgress}
                  size={72}
                  strokeColor={{
                    '0%': '#6366f1',
                    '100%': '#4f46e5',
                  }}
                  format={() => (
                    <span className="text-sm font-semibold">
                      {summary.recordedCount}/{summary.totalCount}
                    </span>
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="metric-label">录入进度</div>
                <div className="flex items-center gap-2 mt-1">
                  {recordProgress >= 100 ? (
                    <span className="status-badge success">
                      <CheckCircleOutlined />
                      已完成
                    </span>
                  ) : (
                    <span className="status-badge warning">
                      <ClockCircleOutlined />
                      进行中
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 平均 CPM */}
          {enabledMetrics.includes('cpm') && (
            <div
              className="metric-card cpm"
              style={{ animationDelay: `${(statsMetrics.length + 1) * 0.1}s` }}
            >
              <div className="metric-card-inner">
                <div className="metric-icon">
                  <DollarOutlined />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="metric-label">平均 CPM</div>
                  <div
                    className={`metric-value ${
                      cpmBenchmark && summary.avgCpm <= cpmBenchmark
                        ? 'text-emerald-600'
                        : 'text-amber-500'
                    }`}
                  >
                    {summary.avgCpm.toFixed(2)}
                  </div>
                  {cpmBenchmark && (
                    <div className="metric-benchmark">
                      <span>基准:</span>
                      <span className="font-medium">{cpmBenchmark}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CPM 达成率 */}
          {enabledMetrics.includes('cpm') && cpmBenchmark && (
            <div
              className="metric-card cpm"
              style={{ animationDelay: `${(statsMetrics.length + 2) * 0.1}s` }}
            >
              <div className="metric-card-inner">
                <div className="progress-ring">
                  <Progress
                    type="circle"
                    percent={Math.min(cpmAchievement, 100)}
                    size={72}
                    strokeColor={
                      cpmAchievement >= 100
                        ? { '0%': '#10b981', '100%': '#059669' }
                        : { '0%': '#f59e0b', '100%': '#d97706' }
                    }
                    format={() => (
                      <span className="text-sm font-semibold">
                        {cpmAchievement}%
                      </span>
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="metric-label">CPM 达成率</div>
                  <div className="flex items-center gap-2 mt-1">
                    {cpmAchievement >= 100 ? (
                      <span className="status-badge success">
                        <CheckCircleOutlined />
                        达标
                      </span>
                    ) : (
                      <span className="status-badge warning">
                        <ClockCircleOutlined />
                        未达标
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 平均 ROI */}
          {enabledMetrics.includes('roi') && (
            <div
              className="metric-card roi"
              style={{
                animationDelay: `${
                  (statsMetrics.length +
                    (enabledMetrics.includes('cpm') ? 2 : 0) +
                    (cpmBenchmark ? 1 : 0)) *
                  0.1
                }s`,
              }}
            >
              <div className="metric-card-inner">
                <div className="metric-icon">
                  <RiseOutlined />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="metric-label">平均 ROI</div>
                  <div
                    className={`metric-value ${
                      benchmarks.roi && summary.avgRoi >= benchmarks.roi
                        ? 'text-emerald-600'
                        : 'text-amber-500'
                    }`}
                  >
                    {summary.avgRoi.toFixed(2)}%
                  </div>
                  {benchmarks.roi && (
                    <div className="metric-benchmark">
                      <span>基准:</span>
                      <span className="font-medium">{benchmarks.roi}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 达人明细表格 */}
        {collaborations.length > 0 ? (
          <div className="data-table-wrapper">
            <ProTable<Collaboration>
              columns={columns}
              actionRef={actionRef}
              cardBordered={false}
              dataSource={collaborations}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: t => `共 ${t} 条`,
              }}
              search={false}
              dateFormatter="string"
              headerTitle={`${EFFECT_PERIOD_OPTIONS.find(p => p.key === period)?.label || period} 效果明细`}
              toolBarRender={() => [
                <Button
                  key="refresh"
                  icon={<ReloadOutlined />}
                  onClick={() => loadCollaborations()}
                >
                  刷新
                </Button>,
              ]}
              scroll={{ x: 1000 }}
              options={{
                reload: false,
                density: false,
                setting: true,
              }}
              size="middle"
            />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <LineChartOutlined />
            </div>
            <Empty
              description={
                <span className="text-gray-500">暂无已发布的合作记录</span>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default EffectTab;
