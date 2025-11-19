/**
 * 字段映射配置管理 Hook
 */

import { useState, useEffect } from 'react';
import {
  getFieldMappings,
  createFieldMapping,
  updateFieldMapping,
  deleteFieldMapping,
  type FieldMappingConfig
} from '../api/performance';
import type { Platform } from '../types/talent';
import { useToast } from './useToast';

export function useFieldMapping(platform: Platform) {
  const [configs, setConfigs] = useState<FieldMappingConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<FieldMappingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  // 加载配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await getFieldMappings(platform);
      if (response.success && response.data) {
        setConfigs(response.data);
        const active = response.data.find((c: FieldMappingConfig) => c.isActive);
        setActiveConfig(active || null);
      }
    } catch (err) {
      console.error('加载字段映射配置失败:', err);
      error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建配置
  const createConfig = async (config: Partial<FieldMappingConfig>) => {
    try {
      setLoading(true);
      const response = await createFieldMapping(config);
      if (response.success) {
        success('配置创建成功');
        await loadConfigs();
      }
    } catch (err) {
      error('创建配置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 更新配置
  const updateConfig = async (config: FieldMappingConfig) => {
    try {
      setLoading(true);
      const response = await updateFieldMapping(config);
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

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      setLoading(true);
      const response = await deleteFieldMapping(id);
      if (response.success) {
        success('配置删除成功');
        await loadConfigs();
      }
    } catch (err) {
      error('删除配置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadConfigs();
  }, [platform]);

  return {
    configs,
    activeConfig,
    loading,
    loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig
  };
}
