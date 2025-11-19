/**
 * 字段映射配置管理 Hook
 */

import { useState, useEffect } from 'react';
import {
  getFieldMappings,
  type FieldMappingConfig
} from '../api/performance';
import type { Platform } from '../types/talent';
import { useToast } from './useToast';

export function useFieldMapping(platform: Platform) {
  const [configs, setConfigs] = useState<FieldMappingConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<FieldMappingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const { error } = useToast();

  // 加载配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response: any = await getFieldMappings(platform);
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


  // 初始加载
  useEffect(() => {
    loadConfigs();
  }, [platform]);

  return {
    configs,
    activeConfig,
    loading,
    loadConfigs
  };
}
