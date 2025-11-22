/**
 * 平台配置 - 统一管理所有平台的基础信息和费率
 * 用于客户管理、项目管理等模块
 */

export interface PlatformConfig {
  key: string;           // 平台唯一标识
  name: string;          // 平台中文名称
  fee: number | null;    // 平台费率（null 表示待确定）
  enabled: boolean;      // 是否已开通
  color: string;         // 主题色
  hoverColor?: string;   // hover 颜色
  description?: string;  // 描述
}

/**
 * 达人采买平台配置（水上达人）
 */
export const TALENT_PLATFORMS: PlatformConfig[] = [
  {
    key: 'douyin',
    name: '抖音',
    fee: 0.05,
    enabled: true,
    color: 'blue',
    hoverColor: 'hover:bg-blue-50',
    description: '已开通',
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    fee: 0.10,
    enabled: true,
    color: 'red',
    hoverColor: 'hover:bg-red-50',
    description: '已开通',
  },
  {
    key: 'shipinhao',
    name: '视频号',
    fee: null,
    enabled: false,
    color: 'gray',
    description: '预留',
  },
  {
    key: 'bilibili',
    name: 'B站',
    fee: null,
    enabled: false,
    color: 'gray',
    description: '预留',
  },
  {
    key: 'weibo',
    name: '微博',
    fee: null,
    enabled: false,
    color: 'gray',
    description: '预留',
  },
];

/**
 * 获取已开通的平台列表
 */
export const getEnabledPlatforms = () => {
  return TALENT_PLATFORMS.filter(p => p.enabled);
};

/**
 * 根据 key 获取平台配置
 */
export const getPlatformByKey = (key: string) => {
  return TALENT_PLATFORMS.find(p => p.key === key);
};

/**
 * 获取平台中文名称
 */
export const getPlatformName = (key: string) => {
  return getPlatformByKey(key)?.name || key;
};

/**
 * 获取平台费率
 */
export const getPlatformFee = (key: string) => {
  return getPlatformByKey(key)?.fee || 0;
};
