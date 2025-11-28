/**
 * 维度配置管理 Hook
 */

import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  getDimensionConfigs,
  createDimensionConfig,
  updateDimensionConfig,
  deleteDimensionConfig,
  type DimensionConfigDoc,
  type DimensionConfig
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
        // visibleDimensionIds 由下方的 useEffect 根据 activeConfig 处理
      }
    } catch (err) {
      logger.error('加载维度配置失败:', err);
      error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新配置
  const createConfig = async (config: Partial<DimensionConfigDoc>) => {
    try {
      setLoading(true);
      const response: any = await createDimensionConfig(config);
      if (response.success) {
        success('配置创建成功');
        await loadConfigs();
        return response.data;
      }
    } catch (err) {
      error('创建配置失败');
      throw err;
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
        return response.data;
      }
    } catch (err) {
      error('更新配置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      setLoading(true);
      const response: any = await deleteDimensionConfig(id);
      if (response.success) {
        success('配置删除成功');
        await loadConfigs();
        return true;
      }
    } catch (err) {
      error('删除配置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 添加维度
  const addDimension = async (dimension: DimensionConfig) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedConfig = {
      ...activeConfig,
      dimensions: [...activeConfig.dimensions, dimension]
    };

    await updateConfig(updatedConfig);
  };

  // 更新维度
  const updateDimension = async (index: number, dimension: DimensionConfig) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedDimensions = [...activeConfig.dimensions];
    updatedDimensions[index] = dimension;

    const updatedConfig = {
      ...activeConfig,
      dimensions: updatedDimensions
    };

    await updateConfig(updatedConfig);
  };

  // 删除维度
  const deleteDimension = async (index: number) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedDimensions = activeConfig.dimensions.filter((_, i) => i !== index);

    const updatedConfig = {
      ...activeConfig,
      dimensions: updatedDimensions
    };

    await updateConfig(updatedConfig);
  };

  // 重新排序维度
  const reorderDimensions = async (dimensions: DimensionConfig[]) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    // 更新order字段
    const reorderedDimensions = dimensions.map((dim, index) => ({
      ...dim,
      order: index
    }));

    const updatedConfig = {
      ...activeConfig,
      dimensions: reorderedDimensions
    };

    await updateConfig(updatedConfig);
  };

  // 批量更新维度（不改变顺序，用于批量修改 defaultVisible 等属性）
  const batchUpdateDimensions = async (dimensions: DimensionConfig[]) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedDefaultVisibleIds = dimensions
      .filter(d => d.defaultVisible)
      .map(d => d.id);

    const updatedConfig = {
      ...activeConfig,
      dimensions,
      defaultVisibleIds: updatedDefaultVisibleIds
    };

    await updateConfig(updatedConfig);
  };

  // 切换维度可见性
  const toggleDimensionVisibility = async (dimensionId: string) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const dimension = activeConfig.dimensions.find(d => d.id === dimensionId);
    if (!dimension) return;

    const updatedDimensions = activeConfig.dimensions.map(d =>
      d.id === dimensionId ? { ...d, defaultVisible: !d.defaultVisible } : d
    );

    const updatedDefaultVisibleIds = updatedDimensions
      .filter(d => d.defaultVisible)
      .map(d => d.id);

    const updatedConfig = {
      ...activeConfig,
      dimensions: updatedDimensions,
      defaultVisibleIds: updatedDefaultVisibleIds
    };

    await updateConfig(updatedConfig);
  };

  // 更新显示的维度ID列表（用户偏好，仅保存在localStorage）
  const updateVisibleIds = (ids: string[]) => {
    setVisibleDimensionIds(ids);
    localStorage.setItem(`performance_visible_dimensions_${platform}`, JSON.stringify(ids));
  };

  // 初始加载
  useEffect(() => {
    loadConfigs();
  }, [platform]);

  // 当 activeConfig 变化时，合并 localStorage 偏好
  // 优先使用数据库的 defaultVisibleIds，但保留用户之前选中的有效维度
  useEffect(() => {
    if (!activeConfig) return;

    const saved = localStorage.getItem(`performance_visible_dimensions_${platform}`);
    if (saved) {
      try {
        const savedIds = JSON.parse(saved) as string[];
        // 获取当前配置中所有有效的维度ID
        const validDimensionIds = new Set(activeConfig.dimensions.map(d => d.id));
        // 过滤掉不再存在的维度，保留仍然有效的
        const validSavedIds = savedIds.filter(id => validDimensionIds.has(id));

        // 检查是否有新的默认显示维度需要添加
        const defaultIds = activeConfig.defaultVisibleIds || [];
        const newDefaultIds = defaultIds.filter(id =>
          validDimensionIds.has(id) && !validSavedIds.includes(id)
        );

        // 如果有新的默认维度（如 price），自动添加
        if (newDefaultIds.length > 0) {
          const mergedIds = [...validSavedIds, ...newDefaultIds];
          setVisibleDimensionIds(mergedIds);
          localStorage.setItem(`performance_visible_dimensions_${platform}`, JSON.stringify(mergedIds));
        } else {
          setVisibleDimensionIds(validSavedIds);
        }
      } catch (e) {
        // 解析错误，使用默认配置
        setVisibleDimensionIds(activeConfig.defaultVisibleIds || []);
      }
    } else {
      // 没有保存的偏好，使用默认配置
      setVisibleDimensionIds(activeConfig.defaultVisibleIds || []);
    }
  }, [activeConfig, platform]);

  return {
    configs,
    activeConfig,
    visibleDimensionIds,
    loading,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    addDimension,
    updateDimension,
    deleteDimension,
    reorderDimensions,
    batchUpdateDimensions,
    toggleDimensionVisibility,
    updateVisibleIds
  };
}
