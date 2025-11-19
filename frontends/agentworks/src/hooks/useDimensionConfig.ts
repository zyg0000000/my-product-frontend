/**
 * 维度配置管理 Hook
 */

import { useState, useEffect } from 'react';
import {
  getDimensionConfigs,
  updateDimensionConfig,
  type DimensionConfigDoc
} from '../api/performance';
import type { Platform } from '../types/talent';
import { useToast } from './useToast';

export function useDimensionConfig(platform: Platform) {
  const [configs, setConfigs] = useState<DimensionConfigDoc[]>([]);
  const [activeConfig, setActiveConfig] = useState<DimensionConfigDoc | null>(null);
  const [visibleDimensionIds, setVisibleDimensionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  // 加载配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response: any = await getDimensionConfigs(platform);
      if (response.success && response.data) {
        setConfigs(response.data);
        const active = response.data.find((c: DimensionConfigDoc) => c.isActive);
        setActiveConfig(active || null);

        // 设置默认显示的维度
        if (active) {
          setVisibleDimensionIds(active.defaultVisibleIds || []);
        }
      }
    } catch (err) {
      console.error('加载维度配置失败:', err);
      error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新配置
  const updateConfig = async (config: DimensionConfigDoc) => {
    try {
      setLoading(true);
      const response: any = await updateDimensionConfig(config);
      if (response.success) {
        success('配置更新成功');
        await loadConfigs();
      }
    } catch (err) {
      error('更新配置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 更新显示的维度ID列表
  const updateVisibleIds = (ids: string[]) => {
    setVisibleDimensionIds(ids);
    // 可选：保存到用户偏好（localStorage或数据库）
    localStorage.setItem(`performance_visible_dimensions_${platform}`, JSON.stringify(ids));
  };

  // 初始加载
  useEffect(() => {
    loadConfigs();

    // 尝试从 localStorage 读取用户偏好
    const saved = localStorage.getItem(`performance_visible_dimensions_${platform}`);
    if (saved) {
      try {
        setVisibleDimensionIds(JSON.parse(saved));
      } catch (e) {
        // 忽略解析错误
      }
    }
  }, [platform]);

  return {
    configs,
    activeConfig,
    visibleDimensionIds,
    loading,
    loadConfigs,
    updateConfig,
    updateVisibleIds
  };
}
