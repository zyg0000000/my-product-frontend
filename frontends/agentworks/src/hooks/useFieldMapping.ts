/**
 * 字段映射配置管理 Hook
 */

import { useState, useEffect } from 'react';
import {
  getFieldMappings,
  createFieldMapping,
  updateFieldMapping,
  deleteFieldMapping,
  type FieldMappingConfig,
  type FieldMappingRule,
  type ComputedFieldRule,
} from '../api/performance';
import type { Platform } from '../types/talent';
import { useToast } from './useToast';
import { logger } from '../utils/logger';

export function useFieldMapping(platform: Platform) {
  const [configs, setConfigs] = useState<FieldMappingConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<FieldMappingConfig | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  // 加载配置
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response: any = await getFieldMappings(platform);
      if (response.success && response.data) {
        setConfigs(response.data);
        const active = response.data.find(
          (c: FieldMappingConfig) => c.isActive
        );
        setActiveConfig(active || null);
      }
    } catch (err) {
      logger.error('加载字段映射配置失败:', err);
      error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新配置
  const createConfig = async (config: Partial<FieldMappingConfig>) => {
    try {
      setLoading(true);
      const response: any = await createFieldMapping(config);
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
  const updateConfig = async (config: FieldMappingConfig) => {
    try {
      setLoading(true);
      const response: any = await updateFieldMapping(config);
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
      const response: any = await deleteFieldMapping(id);
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

  // 添加映射规则
  const addMappingRule = async (rule: FieldMappingRule) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedConfig = {
      ...activeConfig,
      mappings: [...activeConfig.mappings, rule],
    };

    await updateConfig(updatedConfig);
  };

  // 更新映射规则
  const updateMappingRule = async (index: number, rule: FieldMappingRule) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedMappings = [...activeConfig.mappings];
    updatedMappings[index] = rule;

    const updatedConfig = {
      ...activeConfig,
      mappings: updatedMappings,
    };

    await updateConfig(updatedConfig);
  };

  // 删除映射规则
  const deleteMappingRule = async (index: number) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedMappings = activeConfig.mappings.filter((_, i) => i !== index);

    const updatedConfig = {
      ...activeConfig,
      mappings: updatedMappings,
    };

    await updateConfig(updatedConfig);
  };

  // ========== 计算字段管理 ==========

  // 添加计算字段
  const addComputedField = async (field: ComputedFieldRule) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedConfig = {
      ...activeConfig,
      computedFields: [...(activeConfig.computedFields || []), field],
    };

    await updateConfig(updatedConfig);
  };

  // 更新计算字段
  const updateComputedField = async (
    index: number,
    field: ComputedFieldRule
  ) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedComputedFields = [...(activeConfig.computedFields || [])];
    updatedComputedFields[index] = field;

    const updatedConfig = {
      ...activeConfig,
      computedFields: updatedComputedFields,
    };

    await updateConfig(updatedConfig);
  };

  // 删除计算字段
  const deleteComputedField = async (index: number) => {
    if (!activeConfig) {
      error('没有激活的配置');
      return;
    }

    const updatedComputedFields = (activeConfig.computedFields || []).filter(
      (_, i) => i !== index
    );

    const updatedConfig = {
      ...activeConfig,
      computedFields: updatedComputedFields,
    };

    await updateConfig(updatedConfig);
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
    deleteConfig,
    addMappingRule,
    updateMappingRule,
    deleteMappingRule,
    // 计算字段
    addComputedField,
    updateComputedField,
    deleteComputedField,
  };
}
