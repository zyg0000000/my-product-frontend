/**
 * 客户项目配置类型定义
 * @module types/projectConfig
 * @version 1.0.0
 *
 * 用于控制不同客户的项目详情页显示内容
 */

/**
 * 项目详情页 Tab 键值
 */
export type ProjectTabKey =
  | 'collaborations'
  | 'execution'
  | 'finance'
  | 'effect'
  | 'registration';

/**
 * Tab 可见性配置
 */
export interface TabVisibilityConfig {
  /** 合作达人 */
  collaborations: boolean;
  /** 执行追踪 */
  execution: boolean;
  /** 财务管理 */
  finance: boolean;
  /** 效果验收 */
  effect: boolean;
  /** 报名管理（默认关闭） */
  registration?: boolean;
}

/**
 * 效果验收数据周期
 */
export type EffectPeriod = 't7' | 't21' | 't30';

/**
 * 效果验收指标配置
 */
export interface EffectMetricConfig {
  /** 指标键 */
  key: string;
  /** 显示名称 */
  label: string;
  /** 是否默认启用 */
  enabled: boolean;
  /** 单位 */
  unit?: string;
  /** 排序顺序 */
  order?: number;
}

/**
 * 效果验收配置
 */
export interface EffectTabConfig {
  /** 启用的数据周期 */
  enabledPeriods: EffectPeriod[];
  /** 启用的指标列 */
  enabledMetrics: string[];
  /** 基准值配置 */
  benchmarks?: {
    cpm?: number;
    cpe?: number;
    roi?: number;
    [key: string]: number | undefined;
  };
  /** 自定义指标（客户特有） */
  customMetrics?: EffectMetricConfig[];
}

/**
 * 执行追踪配置（预留扩展）
 */
export interface ExecutionTabConfig {
  /** 是否显示延期预警 */
  showDelayAlert?: boolean;
  /** 预警提前天数 */
  alertDaysAhead?: number;
  /** 启用的统计卡片 */
  enabledStatCards?: string[];
}

/**
 * 财务管理配置
 */
export interface FinanceTabConfig {
  /** 是否启用资金占用费用计算 */
  enableFundsOccupation?: boolean;
  /** 资金占用月费率（%），默认 0.7 */
  fundsOccupationRate?: number;
  /** 是否显示结算文件管理 */
  enableSettlementFiles?: boolean;
  /** 调整项类型选项（不配置则使用默认） */
  adjustmentTypes?: string[];
}

/**
 * 客户项目配置（完整）
 */
export interface CustomerProjectConfig {
  /** 是否启用自定义项目配置 */
  enabled: boolean;
  /** Tab 可见性配置 */
  tabVisibility: TabVisibilityConfig;
  /** 效果验收配置 */
  effectConfig?: EffectTabConfig;
  /** 执行追踪配置（预留） */
  executionConfig?: ExecutionTabConfig;
  /** 财务管理配置（预留） */
  financeConfig?: FinanceTabConfig;
  /** 更新时间 */
  updatedAt?: string;
  /** 更新人 */
  updatedBy?: string;
}

/**
 * 系统默认配置
 */
export const DEFAULT_PROJECT_CONFIG: CustomerProjectConfig = {
  enabled: false,
  tabVisibility: {
    collaborations: true,
    execution: true,
    finance: true,
    effect: true,
    registration: false,
  },
  effectConfig: {
    enabledPeriods: ['t7', 't21'],
    enabledMetrics: ['plays', 'likes', 'comments', 'shares', 'cpm'],
    benchmarks: {},
  },
  financeConfig: {
    enableFundsOccupation: false,
    enableSettlementFiles: false,
  },
};

/**
 * 默认调整项类型
 */
export const DEFAULT_ADJUSTMENT_TYPES = ['价格调整', '其他'];

/**
 * 默认财务配置
 */
export const DEFAULT_FINANCE_CONFIG: FinanceTabConfig = {
  enableFundsOccupation: false,
  enableSettlementFiles: false,
  adjustmentTypes: DEFAULT_ADJUSTMENT_TYPES,
};

/**
 * 可用的效果指标定义
 */
export const AVAILABLE_EFFECT_METRICS: EffectMetricConfig[] = [
  { key: 'plays', label: '播放量', enabled: true, unit: '次', order: 1 },
  { key: 'likes', label: '点赞数', enabled: true, unit: '个', order: 2 },
  { key: 'comments', label: '评论数', enabled: true, unit: '条', order: 3 },
  { key: 'shares', label: '转发数', enabled: true, unit: '次', order: 4 },
  { key: 'cpm', label: 'CPM', enabled: true, unit: '元', order: 5 },
  { key: 'cpe', label: 'CPE', enabled: false, unit: '元', order: 6 },
  { key: 'gmv', label: 'GMV', enabled: false, unit: '元', order: 7 },
  { key: 'roi', label: 'ROI', enabled: false, unit: '%', order: 8 },
  { key: 'conversions', label: '转化数', enabled: false, unit: '个', order: 9 },
];

/**
 * 效果周期选项
 */
export const EFFECT_PERIOD_OPTIONS: { key: EffectPeriod; label: string }[] = [
  { key: 't7', label: 'T+7 数据' },
  { key: 't21', label: 'T+21 数据' },
  { key: 't30', label: 'T+30 数据' },
];

/**
 * Tab 元数据
 */
export const PROJECT_TABS_METADATA: Record<
  ProjectTabKey,
  { label: string; icon: string; description: string }
> = {
  collaborations: {
    label: '合作达人',
    icon: 'TeamOutlined',
    description: '管理项目合作的达人列表',
  },
  execution: {
    label: '执行追踪',
    icon: 'ScheduleOutlined',
    description: '追踪内容发布执行进度',
  },
  finance: {
    label: '财务管理',
    icon: 'DollarOutlined',
    description: '管理打款、回款等财务信息',
  },
  effect: {
    label: '效果验收',
    icon: 'LineChartOutlined',
    description: '录入和查看投放效果数据',
  },
  registration: {
    label: '报名管理',
    icon: 'FormOutlined',
    description: '抓取星图页面数据并生成报名表',
  },
};
