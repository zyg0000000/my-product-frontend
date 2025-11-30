/**
 * 平台配置管理 Hook
 *
 * @version 1.1.0
 * @description 从服务器加载平台配置，提供缓存和查询功能
 *
 * 功能：
 * - 从服务器加载平台配置
 * - LocalStorage 缓存（24小时）
 * - 提供配置查询方法
 * - 自动处理加载状态
 * - 支持手动刷新
 * - 支持按功能开关过滤平台（v1.1）
 */

import { useState, useEffect } from 'react';
import { getPlatformConfigs } from '../api/platformConfig';
import type { PlatformConfig, TalentTierConfig } from '../api/platformConfig';
import type { Platform } from '../types/talent';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/api';

const CACHE_KEY = 'agentworks_platform_configs';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

interface CacheData {
  configs: PlatformConfig[];
  timestamp: number;
}

/**
 * 从 LocalStorage 加载缓存
 */
function loadFromCache(): PlatformConfig[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CacheData = JSON.parse(cached);
    const now = Date.now();

    // 检查缓存是否过期
    if (now - data.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    logger.info('使用缓存的平台配置');
    return data.configs;
  } catch (error) {
    logger.error('读取平台配置缓存失败:', error);
    return null;
  }
}

/**
 * 保存到 LocalStorage
 */
function saveToCache(configs: PlatformConfig[]): void {
  try {
    const data: CacheData = {
      configs,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    logger.info('平台配置已缓存');
  } catch (error) {
    logger.error('保存平台配置缓存失败:', error);
  }
}

/**
 * 平台配置 Hook
 *
 * @param includeDisabled - 是否包含禁用的平台（默认 false）
 */
export function usePlatformConfig(includeDisabled = false) {
  const [configs, setConfigs] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfigs = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // 如果不是强制刷新，先尝试从缓存加载
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached && cached.length > 0) {
          // 根据 includeDisabled 参数过滤缓存数据
          const filteredConfigs = includeDisabled
            ? cached
            : cached.filter(c => c.enabled);
          setConfigs(filteredConfigs);
          setLoading(false);
          return;
        }
      }

      // 从服务器加载（始终获取所有平台配置）
      logger.info('从服务器加载平台配置');
      const response = await getPlatformConfigs();

      if (response.success && response.data) {
        // 缓存所有平台配置（包括禁用的）
        saveToCache(response.data);

        // 根据 includeDisabled 参数过滤后返回
        const filteredConfigs = includeDisabled
          ? response.data
          : response.data.filter(c => c.enabled);

        setConfigs(filteredConfigs);
        logger.info(
          `平台配置加载成功，共 ${filteredConfigs.length} 个平台（总数 ${response.data.length}）`
        );
      } else {
        throw new Error(response.message || '加载平台配置失败');
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err) || '加载平台配置失败';
      logger.error('加载平台配置失败:', err);
      setError(errorMsg);

      // 如果从服务器加载失败，尝试使用缓存（即使过期）
      const cached = loadFromCache();
      if (cached && cached.length > 0) {
        logger.warn('使用过期的缓存配置');
        setConfigs(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载
  useEffect(() => {
    loadConfigs();
  }, []);

  // ==================== 工具方法 ====================

  /**
   * 获取平台名称映射对象
   * @returns { douyin: '抖音', xiaohongshu: '小红书', ... }
   */
  const getPlatformNames = (): Record<Platform, string> => {
    return configs.reduce(
      (acc, c) => {
        acc[c.platform] = c.name;
        return acc;
      },
      {} as Record<Platform, string>
    );
  };

  /**
   * 获取平台列表数组
   * @returns ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou']
   */
  const getPlatformList = (): Platform[] => {
    return configs.map(c => c.platform);
  };

  /**
   * 功能开关类型
   */
  type FeatureKey = keyof PlatformConfig['features'];

  /**
   * 获取启用了指定功能的平台列表
   * @param feature - 功能开关名称
   * @returns 启用了该功能的平台标识数组
   *
   * @example
   * // 获取启用了表现追踪的平台
   * const platforms = getPlatformsByFeature('performanceTracking');
   * // => ['douyin']
   */
  const getPlatformsByFeature = (feature: FeatureKey): Platform[] => {
    return configs
      .filter(c => c.features?.[feature] === true)
      .map(c => c.platform);
  };

  /**
   * 检查平台是否启用了指定功能
   * @param platform - 平台标识
   * @param feature - 功能开关名称
   * @returns 是否启用
   */
  const hasFeature = (platform: Platform, feature: FeatureKey): boolean => {
    const config = getPlatformConfigByKey(platform);
    return config?.features?.[feature] === true;
  };

  /**
   * 获取单个平台配置
   * @param platform - 平台标识
   * @returns 平台配置对象或 undefined
   */
  const getPlatformConfigByKey = (
    platform: Platform
  ): PlatformConfig | undefined => {
    return configs.find(c => c.platform === platform);
  };

  /**
   * 获取平台的价格类型列表
   * @param platform - 平台标识
   * @returns 价格类型配置数组
   */
  const getPlatformPriceTypes = (platform: Platform) => {
    const config = getPlatformConfigByKey(platform);
    return config?.priceTypes || [];
  };

  /**
   * 获取平台的达人等级列表
   * @param platform - 平台标识
   * @returns 达人等级配置数组（按 order 排序）
   */
  const getTalentTiers = (platform: Platform): TalentTierConfig[] => {
    const config = getPlatformConfigByKey(platform);
    const tiers = config?.talentTiers || [];
    return [...tiers].sort((a, b) => a.order - b.order);
  };

  /**
   * 获取平台的默认达人等级
   * @param platform - 平台标识
   * @returns 默认达人等级配置或 undefined
   */
  const getDefaultTalentTier = (
    platform: Platform
  ): TalentTierConfig | undefined => {
    const tiers = getTalentTiers(platform);
    return tiers.find(t => t.isDefault) || tiers[0];
  };

  /**
   * 刷新配置（清除缓存并重新加载）
   */
  const refreshConfigs = () => {
    localStorage.removeItem(CACHE_KEY);
    return loadConfigs(true);
  };

  return {
    // 状态
    configs,
    loading,
    error,

    // 工具方法
    getPlatformNames,
    getPlatformList,
    getPlatformsByFeature,
    hasFeature,
    getPlatformConfigByKey,
    getPlatformPriceTypes,
    getTalentTiers,
    getDefaultTalentTier,
    refreshConfigs,
  };
}
