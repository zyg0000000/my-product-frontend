/**
 * @module constants
 * @description API configuration and application constants
 * @version 3.0 - Added view modes and chart field options for customer view
 */

/**
 * Base URL for API requests
 * @constant {string}
 */
export const API_BASE_URL = 'https://sd2pl0r2pkvfku8btbid0.apigateway-cn-shanghai.volceapi.com';

/**
 * API endpoints
 * @constant {Object}
 */
export const API_ENDPOINTS = {
  PROJECTS: '/projects',
  BATCH_PROJECT_PERFORMANCE: '/batch-project-performance'
};

/**
 * Time dimension options
 * @constant {Object}
 */
export const TIME_DIMENSIONS = {
  FINANCIAL: 'financial',
  CUSTOMER: 'customer'
};

/**
 * View mode options
 * @constant {Object}
 */
export const VIEW_MODES = {
  CUSTOMER: 'customer',    // 客户视角（默认）- 隐藏利润相关指标
  FINANCIAL: 'financial'   // 财务视角（内部）- 显示完整指标
};

/**
 * Default filter values
 * @constant {Object}
 */
export const DEFAULT_FILTERS = {
  timeDimension: TIME_DIMENSIONS.CUSTOMER,  // 默认客户月份
  year: '',
  month: '',
  projectType: ''
};

/**
 * Chart field options for customer view (dual-axis chart)
 * @constant {Object}
 */
export const CHART_FIELD_OPTIONS = {
  // 左轴（柱状图）可选字段
  leftAxis: [
    { id: 'totalIncome', label: '代理消耗', format: 'currency' },
    { id: 'fundsOccupationCost', label: '资金占用费用', format: 'currency' }
  ],
  // 右轴（折线图）可选字段
  rightAxis: [
    { id: 'collaboratorCount', label: '合作内容数', format: 'number' },
    { id: 'projectCount', label: '项目数量', format: 'number' }
  ]
};

/**
 * Default chart field selections
 * @constant {Object}
 */
export const DEFAULT_CHART_FIELDS = {
  leftAxis: 'totalIncome',
  rightAxis: 'collaboratorCount'
};

/**
 * Funds occupation cost tooltip explanation
 * @constant {string}
 */
export const FUNDS_COST_TOOLTIP = `资金占用费用 = 支出金额 × 日费率 × 占用天数

• 占用天数：从下单日期到回款日期
• 日费率：月费率(默认0.7%) ÷ 30天
• 这是我们每月承担的隐形资金成本`;

/**
 * Chart configuration constants
 * @constant {Object}
 */
export const CHART_CONFIG = {
  COLORS: {
    // 财务视角颜色
    INCOME_BAR: 'rgba(59, 130, 246, 0.5)',
    INCOME_BORDER: 'rgba(59, 130, 246, 1)',
    MARGIN_LINE: 'rgba(139, 92, 246, 1)',
    MARGIN_FILL: 'rgba(139, 92, 246, 0.2)',
    // 客户视角颜色
    CUSTOMER_BAR: 'rgba(59, 130, 246, 0.6)',
    CUSTOMER_BAR_BORDER: 'rgba(59, 130, 246, 1)',
    CUSTOMER_LINE: 'rgba(16, 185, 129, 1)',
    CUSTOMER_LINE_FILL: 'rgba(16, 185, 129, 0.1)',
    // 效果验收图表颜色
    TARGET_BAR: 'rgba(156, 163, 175, 0.6)',      // 目标值 - 灰色
    TARGET_BAR_BORDER: 'rgba(156, 163, 175, 1)',
    ACTUAL_BAR: 'rgba(16, 185, 129, 0.6)',       // 实际值 - 绿色
    ACTUAL_BAR_BORDER: 'rgba(16, 185, 129, 1)'
  },
  LINE_TENSION: 0.3
};

/**
 * Effect performance metric options
 * @constant {Object}
 */
export const EFFECT_METRIC_OPTIONS = {
  views: {
    id: 'views',
    label: '播放量',
    targetField: 'targetViews',
    actualField: 't21_totalViews',
    format: 'number',
    targetLabel: '目标播放量',
    actualLabel: '实际播放量(T+21)'
  },
  cpm: {
    id: 'cpm',
    label: 'CPM',
    targetField: 'benchmarkCPM',
    actualField: 't21_cpm',
    format: 'currency',
    targetLabel: '目标CPM',
    actualLabel: '实际CPM(T+21)'
  }
};