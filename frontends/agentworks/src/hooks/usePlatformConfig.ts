/**
 * 平台配置管理 Hook
 *
 * @version 1.0.0
 * @description 从服务器加载平台配置，提供缓存和查询功能
 *
 * 功能：
 * - 从服务器加载平台配置
 * - LocalStorage 缓存（24小时）
 * - 提供配置查询方法
 * - 自动处理加载状态
 * - 支持手动刷新
 */

import { useState, useEffect } from 'react';
import { getPlatformConfigs } from '../api/platformConfig';
import type { PlatformConfig } from '../api/platformConfig';
import type { Platform } from '../types/talent';
import { logger } from '../utils/logger';

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
      timestamp: Date.now()
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
          setConfigs(cached);
          setLoading(false);
          return;
        }
      }

      // 从服务器加载
      logger.info('从服务器加载平台配置');
      // includeDisabled 为 true 时不传 enabled 参数，获取所有平台
      const response = includeDisabled
        ? await getPlatformConfigs()
        : await getPlatformConfigs(true);

      if (response.success && response.data) {
        setConfigs(response.data);
        saveToCache(response.data);
        logger.info(`平台配置加载成功，共 ${response.data.length} 个平台`);
      } else {
        throw new Error(response.message || '加载平台配置失败');
      }
    } catch (err: any) {
      const errorMsg = err.message || '加载平台配置失败';
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
    return configs.reduce((acc, c) => {
      acc[c.platform] = c.name;
      return acc;
    }, {} as Record<Platform, string>);
  };

  /**
   * 获取平台列表数组
   * @returns ['douyin', 'xiaohongshu', 'bilibili', 'kuaishou']
   */
  const getPlatformList = (): Platform[] => {
    return configs.map(c => c.platform);
  };

  /**
   * 获取单个平台配置
   * @param platform - 平台标识
   * @returns 平台配置对象或 undefined
   */
  const getPlatformConfigByKey = (platform: Platform): PlatformConfig | undefined => {
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
    getPlatformConfigByKey,
    getPlatformPriceTypes,
    refreshConfigs,
  };
}
