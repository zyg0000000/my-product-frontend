/**
 * 平台类型枚举
 */
export type Platform = 'douyin' | 'xiaohongshu' | 'bilibili' | 'kuaishou';

/**
 * 平台显示名称映射
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  kuaishou: '快手',
};

/**
 * 价格类型（根据平台不同）
 */
export type PriceType =
  | 'video_60plus' // 抖音：60s+ 长视频
  | 'video_21_60' // 抖音：21-60s 中视频
  | 'video_1_20' // 抖音：1-20s 短视频
  | 'live' // 抖音：直播
  | 'video' // 小红书：视频笔记
  | 'image'; // 小红书：图文笔记

/**
 * 价格类型配置
 */
export interface PriceTypeConfig {
  key: PriceType;
  label: string;
  required: boolean;
  bgColor: string;
  textColor: string;
}

/**
 * 平台价格类型映射
 */
export const PLATFORM_PRICE_TYPES: Record<Platform, PriceTypeConfig[]> = {
  douyin: [
    {
      key: 'video_60plus',
      label: '60s+',
      required: true,
      bgColor: '#dbeafe',
      textColor: '#1e40af',
    },
    {
      key: 'video_21_60',
      label: '21-60s',
      required: true,
      bgColor: '#e0e7ff',
      textColor: '#4338ca',
    },
    {
      key: 'video_1_20',
      label: '1-20s',
      required: true,
      bgColor: '#ddd6fe',
      textColor: '#6b21a8',
    },
  ],
  xiaohongshu: [
    {
      key: 'video',
      label: '视频笔记',
      required: true,
      bgColor: '#fce7f3',
      textColor: '#9f1239',
    },
    {
      key: 'image',
      label: '图文笔记',
      required: true,
      bgColor: '#fee2e2',
      textColor: '#991b1b',
    },
  ],
  bilibili: [],
  kuaishou: [],
};

/**
 * 价格状态
 */
export type PriceStatus = 'confirmed' | 'provisional';

/**
 * 价格记录（时间序列）
 */
export interface PriceRecord {
  year: number;
  month: number;
  type: PriceType;
  price: number; // 单位：分
  status: PriceStatus;
}

/**
 * 返点记录（时间序列）
 */
export interface RebateRecord {
  year: number;
  month: number;
  rate: number; // 百分比，如 15.5 表示 15.5%
}

/**
 * 达人状态
 */
export type TalentStatus = 'active' | 'inactive' | 'archived';

/**
 * oneId 变更历史
 */
export interface OneIdHistoryRecord {
  oldOneId: string;
  mergedAt: string;
  mergedBy: string;
  reason?: string;
}

/**
 * 平台特有字段
 */
export interface PlatformSpecific {
  // 抖音特有
  xingtuId?: string; // 星图ID（也可以作为 platformAccountId）
  uid?: string; // 抖音UID
  starLevel?: number; // 星图等级

  // 小红书特有（字段名后续确定）
  xiaohongshuId?: string; // 小红书ID（预留）
  dandelionId?: string; // 蒲公英ID（预留）
  mcnName?: string;
  contentTags?: string[];

  // B站特有
  upLevel?: string;

  // 快手特有
  kuaishouId?: string;
}

/**
 * 返点模式
 */
export type RebateMode = 'independent' | 'sync';

/**
 * 返点来源
 */
export type RebateSource = 'manual' | 'agency_sync';

/**
 * 当前返点配置
 */
export interface CurrentRebate {
  rate: number; // 当前返点率 (0-100)
  effectiveDate: string; // 生效日期 (YYYY-MM-DD)
  source: RebateSource; // 数据来源
}

/**
 * 达人档案（完整）
 */
export interface Talent {
  _id?: string;
  oneId: string;
  platform: Platform;
  platformAccountId: string;
  name: string;
  fansCount?: number;
  talentType?: string[];
  agencyId?: string; // 机构ID（AGENCY_INDIVIDUAL_ID表示野生达人）
  rebateMode?: RebateMode; // 返点模式（野生达人永远是independent）
  currentRebate?: CurrentRebate; // 当前返点配置
  lastRebateSyncAt?: string; // 最后同步时间（仅机构达人同步模式使用）
  prices: PriceRecord[];
  platformSpecific?: PlatformSpecific;
  performanceData?: {
    avgPlayCount?: number;
    avgLikeCount?: number;
    avgCommentCount?: number;
    cpm?: number;
    audienceAge?: {
      '18_23'?: number;
      '24_30'?: number;
      '31_40'?: number;
      '40_plus'?: number;
    };
    audienceGender?: {
      male?: number;
      female?: number;
    };
  };
  schedules?: Array<{
    startDate: string;
    endDate: string;
    status: 'available' | 'booked' | 'unavailable';
    projectId?: string;
  }>;
  remarks?: Record<string, string>;
  oneIdHistory?: OneIdHistoryRecord[];
  status: TalentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 达人列表项（用于列表页显示）
 */
export interface TalentListItem {
  _id: string;
  oneId: string;
  platform: Platform;
  name: string;
  fansCount?: number;
  agencyId?: string; // ⭐ 新增：机构ID
  agencyName?: string; // ⭐ 新增：机构名称（前端展示用）
  currentRebate?: {
    // ⭐ 新增：当前返点配置
    rate: number;
    source: 'default' | 'personal' | 'rule' | 'agency';
    effectiveDate: string;
    lastUpdated: string;
  };
  rebateSource?: 'default' | 'agency' | 'system'; // ⭐ 新增：返点来源
  latestPrices: Partial<Record<PriceType, number>>; // 最新月份的价格
  latestRebate?: number; // 最新月份的返点
  status: TalentStatus;
}

/**
 * API 响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number; // 列表查询时返回的记录总数
  message?: string;
  error?: string;
}
