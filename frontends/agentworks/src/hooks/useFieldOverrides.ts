/**
 * 字段配置覆盖 Hook (localStorage)
 *
 * 用于达人全景页面的字段配置管理：
 * - 字段显示顺序（分类内）
 * - 字段宽度
 * - 字段排序开关
 *
 * 存储格式：
 * {
 *   "panorama_field_overrides": {
 *     "fieldId": {
 *       "order": number,      // 在分类内的顺序（0-based）
 *       "width": number,      // 列宽（像素）
 *       "sortable": boolean   // 是否支持排序
 *     }
 *   }
 * }
 */

import { useState, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import type { FieldDefinition } from '../config/panoramaFields';

const STORAGE_KEY = 'panorama_field_overrides';

/**
 * 字段覆盖配置
 */
export interface FieldOverride {
  order?: number;
  width?: number;
  sortable?: boolean;
}

/**
 * 覆盖配置映射表
 */
export type FieldOverrides = Record<string, FieldOverride>;

/**
 * 从 localStorage 读取覆盖配置
 */
function loadOverrides(): FieldOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as FieldOverrides;
  } catch (err) {
    logger.error('加载字段覆盖配置失败:', err);
    return {};
  }
}

/**
 * 保存覆盖配置到 localStorage
 */
function saveOverrides(overrides: FieldOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    logger.error('保存字段覆盖配置失败:', err);
  }
}

/**
 * 应用覆盖配置到字段列表
 */
function applyOverrides(
  fields: FieldDefinition[],
  overrides: FieldOverrides
): FieldDefinition[] {
  return fields.map(field => {
    const override = overrides[field.id];
    if (!override) return field;

    return {
      ...field,
      order: override.order !== undefined ? override.order : field.order,
      width: override.width !== undefined ? override.width : field.width,
      sortable:
        override.sortable !== undefined ? override.sortable : field.sortable,
    };
  });
}

/**
 * 字段配置覆盖 Hook
 */
export function useFieldOverrides(defaultFields: FieldDefinition[]) {
  const [overrides, setOverrides] = useState<FieldOverrides>(loadOverrides);

  // 应用覆盖后的字段列表
  const fieldsWithOverrides = useMemo(() => {
    return applyOverrides(defaultFields, overrides);
  }, [defaultFields, overrides]);

  // 更新单个字段的覆盖配置
  const updateOverride = useCallback(
    (fieldId: string, override: Partial<FieldOverride>) => {
      setOverrides(prev => {
        const updated = {
          ...prev,
          [fieldId]: {
            ...prev[fieldId],
            ...override,
          },
        };
        saveOverrides(updated);
        return updated;
      });
    },
    []
  );

  // 更新字段宽度
  const updateWidth = useCallback(
    (fieldId: string, width: number) => {
      updateOverride(fieldId, { width });
    },
    [updateOverride]
  );

  // 切换字段排序开关
  const toggleSortable = useCallback(
    (fieldId: string) => {
      const currentField = fieldsWithOverrides.find(f => f.id === fieldId);
      if (!currentField) return;

      const newSortable = !currentField.sortable;
      updateOverride(fieldId, { sortable: newSortable });
    },
    [fieldsWithOverrides, updateOverride]
  );

  // 在分类内上移字段（交换 order）
  const moveFieldUp = useCallback(
    (fieldId: string, category: string) => {
      const categoryFields = fieldsWithOverrides
        .filter(f => f.category === category)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const fieldIndex = categoryFields.findIndex(f => f.id === fieldId);
      if (fieldIndex <= 0) return; // 已经是第一个

      const currentField = categoryFields[fieldIndex];
      const prevField = categoryFields[fieldIndex - 1];

      // 交换 order
      const currentOrder = currentField.order;
      const prevOrder = prevField.order;

      setOverrides(prev => {
        const updated = {
          ...prev,
          [currentField.id]: {
            ...prev[currentField.id],
            order: prevOrder,
          },
          [prevField.id]: {
            ...prev[prevField.id],
            order: currentOrder,
          },
        };
        saveOverrides(updated);
        return updated;
      });
    },
    [fieldsWithOverrides]
  );

  // 在分类内下移字段（交换 order）
  const moveFieldDown = useCallback(
    (fieldId: string, category: string) => {
      const categoryFields = fieldsWithOverrides
        .filter(f => f.category === category)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const fieldIndex = categoryFields.findIndex(f => f.id === fieldId);
      if (fieldIndex < 0 || fieldIndex >= categoryFields.length - 1) return; // 已经是最后一个

      const currentField = categoryFields[fieldIndex];
      const nextField = categoryFields[fieldIndex + 1];

      // 交换 order
      const currentOrder = currentField.order;
      const nextOrder = nextField.order;

      setOverrides(prev => {
        const updated = {
          ...prev,
          [currentField.id]: {
            ...prev[currentField.id],
            order: nextOrder,
          },
          [nextField.id]: {
            ...prev[nextField.id],
            order: currentOrder,
          },
        };
        saveOverrides(updated);
        return updated;
      });
    },
    [fieldsWithOverrides]
  );

  // 重置所有覆盖配置
  const resetOverrides = useCallback(() => {
    setOverrides({});
    saveOverrides({});
  }, []);

  // 检查是否有自定义配置
  const hasOverrides = useMemo(() => {
    return Object.keys(overrides).length > 0;
  }, [overrides]);

  return {
    /** 应用覆盖后的字段列表 */
    fields: fieldsWithOverrides,
    /** 是否有自定义配置 */
    hasOverrides,
    /** 更新字段宽度 */
    updateWidth,
    /** 切换字段排序开关 */
    toggleSortable,
    /** 在分类内上移字段 */
    moveFieldUp,
    /** 在分类内下移字段 */
    moveFieldDown,
    /** 重置所有覆盖配置 */
    resetOverrides,
  };
}
