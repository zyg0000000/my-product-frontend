/**
 * 达人标签配置管理 Hook
 *
 * @version 1.0.0
 * @description 从服务器加载达人标签配置，提供缓存和查询功能
 *
 * 功能：
 * - 从服务器加载全局标签配置
 * - LocalStorage 缓存（24小时）
 * - 提供配置查询方法
 * - 自动处理加载状态
 * - 支持手动刷新和更新
 */

import { useState, useEffect, useCallback } from 'react';
import { getTagConfigs, updateTagConfigs } from '../api/customerTalents';
import type {
  TalentTagConfigs,
  TagConfigItem,
  ImportanceLevel,
} from '../types/customerTalent';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/api';

const CACHE_KEY = 'agentworks_talent_tag_configs';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

interface CacheData {
  configs: TalentTagConfigs;
  timestamp: number;
}

/**
 * 默认标签配置（fallback）
 * v2.0: 使用 bgColor + textColor 替代 color
 */
const DEFAULT_TAG_CONFIGS: TalentTagConfigs = {
  importanceLevels: [
    {
      key: 'core',
      name: '核心',
      bgColor: '#fee2e2',
      textColor: '#dc2626',
      sortOrder: 1,
      description: '必须维护的核心达人，不可替代',
    },
    {
      key: 'key',
      name: '重点',
      bgColor: '#ffedd5',
      textColor: '#ea580c',
      sortOrder: 2,
      description: '重点关注的优质达人',
    },
    {
      key: 'normal',
      name: '常规',
      bgColor: '#dbeafe',
      textColor: '#2563eb',
      sortOrder: 3,
      description: '正常合作的达人',
    },
    {
      key: 'backup',
      name: '备选',
      bgColor: '#cffafe',
      textColor: '#0891b2',
      sortOrder: 4,
      description: '可替代的备选达人',
    },
    {
      key: 'observe',
      name: '观察',
      bgColor: '#f3f4f6',
      textColor: '#6b7280',
      sortOrder: 5,
      description: '观察期/待评估达人',
    },
  ],
  businessTags: [
    {
      key: 'long_term',
      name: '长期合作',
      bgColor: '#dcfce7',
      textColor: '#16a34a',
      sortOrder: 1,
    },
    {
      key: 'new_talent',
      name: '新晋达人',
      bgColor: '#f3e8ff',
      textColor: '#9333ea',
      sortOrder: 2,
    },
    {
      key: 'testing',
      name: '测试中',
      bgColor: '#ffedd5',
      textColor: '#ea580c',
      sortOrder: 3,
    },
    {
      key: 'paused',
      name: '暂停合作',
      bgColor: '#fee2e2',
      textColor: '#dc2626',
      sortOrder: 4,
    },
    {
      key: 'price_sensitive',
      name: '价格敏感',
      bgColor: '#fef3c7',
      textColor: '#d97706',
      sortOrder: 5,
    },
    {
      key: 'fast_response',
      name: '响应快',
      bgColor: '#ecfccb',
      textColor: '#65a30d',
      sortOrder: 6,
    },
    {
      key: 'high_quality',
      name: '内容质量高',
      bgColor: '#fef9c3',
      textColor: '#ca8a04',
      sortOrder: 7,
    },
    {
      key: 'cooperative',
      name: '配合度高',
      bgColor: '#cffafe',
      textColor: '#0891b2',
      sortOrder: 8,
    },
    {
      key: 'busy_schedule',
      name: '档期紧张',
      bgColor: '#fce7f3',
      textColor: '#db2777',
      sortOrder: 9,
    },
  ],
};

/**
 * 从 LocalStorage 加载缓存
 */
function loadFromCache(): TalentTagConfigs | null {
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

    logger.info('使用缓存的标签配置');
    return data.configs;
  } catch (error) {
    logger.error('读取标签配置缓存失败:', error);
    return null;
  }
}

/**
 * 保存到 LocalStorage
 */
function saveToCache(configs: TalentTagConfigs): void {
  try {
    const data: CacheData = {
      configs,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    logger.info('标签配置已缓存');
  } catch (error) {
    logger.error('保存标签配置缓存失败:', error);
  }
}

/**
 * 达人标签配置 Hook
 */
export function useTagConfigs() {
  const [configs, setConfigs] = useState<TalentTagConfigs>(DEFAULT_TAG_CONFIGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 加载配置
  const loadConfigs = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // 如果不是强制刷新，先尝试从缓存加载
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          setConfigs(cached);
          setLoading(false);
          return;
        }
      }

      // 从服务器加载
      logger.info('从服务器加载标签配置');
      const response = await getTagConfigs();

      if (response) {
        saveToCache(response);
        setConfigs(response);
        logger.info(
          `标签配置加载成功，重要程度 ${response.importanceLevels.length} 个，业务标签 ${response.businessTags.length} 个`
        );
      } else {
        throw new Error('加载标签配置失败');
      }
    } catch (err) {
      const errorMsg = getErrorMessage(err) || '加载标签配置失败';
      logger.error('加载标签配置失败:', err);
      setError(errorMsg);

      // 如果从服务器加载失败，尝试使用缓存（即使过期）
      const cached = loadFromCache();
      if (cached) {
        logger.warn('使用过期的缓存配置');
        setConfigs(cached);
      } else {
        // 使用默认配置
        logger.warn('使用默认标签配置');
        setConfigs(DEFAULT_TAG_CONFIGS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时加载
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // ==================== 更新方法 ====================

  /**
   * 更新标签配置
   */
  const saveConfigs = useCallback(
    async (newConfigs: TalentTagConfigs): Promise<boolean> => {
      try {
        setSaving(true);
        setError(null);

        const result = await updateTagConfigs(newConfigs);

        if (result.success) {
          // 更新本地状态和缓存
          setConfigs(newConfigs);
          saveToCache(newConfigs);
          logger.info('标签配置更新成功');
          return true;
        } else {
          throw new Error('更新标签配置失败');
        }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || '更新标签配置失败';
        logger.error('更新标签配置失败:', err);
        setError(errorMsg);
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ==================== 查询方法 ====================

  /**
   * 获取重要程度配置列表（按 sortOrder 排序）
   */
  const getImportanceLevels = useCallback((): TagConfigItem[] => {
    return [...configs.importanceLevels].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
  }, [configs.importanceLevels]);

  /**
   * 获取业务标签配置列表（按 sortOrder 排序）
   */
  const getBusinessTags = useCallback((): TagConfigItem[] => {
    return [...configs.businessTags].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [configs.businessTags]);

  /**
   * 根据 key 获取重要程度配置
   */
  const getImportanceLevelByKey = useCallback(
    (key: ImportanceLevel): TagConfigItem | undefined => {
      if (!key) return undefined;
      return configs.importanceLevels.find(item => item.key === key);
    },
    [configs.importanceLevels]
  );

  /**
   * 根据 key 获取业务标签配置
   */
  const getBusinessTagByKey = useCallback(
    (key: string): TagConfigItem | undefined => {
      return configs.businessTags.find(item => item.key === key);
    },
    [configs.businessTags]
  );

  /**
   * 获取重要程度的显示名称
   */
  const getImportanceLevelName = useCallback(
    (key: ImportanceLevel): string => {
      if (!key) return '-';
      const item = getImportanceLevelByKey(key);
      return item?.name || key;
    },
    [getImportanceLevelByKey]
  );

  /**
   * 获取重要程度的颜色
   */
  const getImportanceLevelColor = useCallback(
    (key: ImportanceLevel): string => {
      if (!key) return 'default';
      const item = getImportanceLevelByKey(key);
      return item?.color || 'default';
    },
    [getImportanceLevelByKey]
  );

  /**
   * 获取业务标签的显示名称
   */
  const getBusinessTagName = useCallback(
    (key: string): string => {
      const item = getBusinessTagByKey(key);
      return item?.name || key;
    },
    [getBusinessTagByKey]
  );

  /**
   * 获取业务标签的颜色
   */
  const getBusinessTagColor = useCallback(
    (key: string): string => {
      const item = getBusinessTagByKey(key);
      return item?.color || 'default';
    },
    [getBusinessTagByKey]
  );

  /**
   * 刷新配置（清除缓存并重新加载）
   */
  const refreshConfigs = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    return loadConfigs(true);
  }, [loadConfigs]);

  return {
    // 状态
    configs,
    loading,
    error,
    saving,

    // 更新方法
    saveConfigs,
    refreshConfigs,

    // 查询方法
    getImportanceLevels,
    getBusinessTags,
    getImportanceLevelByKey,
    getBusinessTagByKey,
    getImportanceLevelName,
    getImportanceLevelColor,
    getBusinessTagName,
    getBusinessTagColor,
  };
}
