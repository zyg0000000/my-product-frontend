/**
 * 达人全景页面 - 列选择状态管理 Hook
 * 管理用户选择的显示字段，支持持久化到 localStorage
 *
 * @version 1.0.0
 * @date 2025-12-04
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Platform } from '@/types/talent';
import {
  type FieldDefinition,
  type FieldCategory,
  DEFAULT_VISIBLE_FIELDS,
  getFieldsForViewMode,
  getFieldsGroupedByCategory,
  FIELD_CATEGORIES,
} from '@/config/panoramaFields';

// ========== 类型定义 ==========

export interface UsePanoramaColumnsOptions {
  /** 当前平台 */
  platform: Platform;
  /** 视角模式 */
  viewMode: 'all' | 'customer';
  /** 用户ID（预留，未来用户系统使用） */
  userId?: string;
  /** 存储方式（预留） */
  storage?: 'local' | 'remote';
}

export interface UsePanoramaColumnsReturn {
  /** 当前选中的字段ID列表 */
  selectedFields: string[];
  /** 更新选中字段 */
  setSelectedFields: (fields: string[]) => void;
  /** 切换单个字段的选中状态 */
  toggleField: (fieldId: string) => void;
  /** 选中分类下的所有字段 */
  selectCategory: (category: FieldCategory) => void;
  /** 取消选中分类下的所有字段 */
  deselectCategory: (category: FieldCategory) => void;
  /** 切换分类全选状态 */
  toggleCategory: (category: FieldCategory) => void;
  /** 恢复默认字段 */
  resetToDefault: () => void;
  /** 可用字段列表（根据平台和视角过滤） */
  availableFields: FieldDefinition[];
  /** 按分类分组的可用字段 */
  fieldsByCategory: Record<FieldCategory, FieldDefinition[]>;
  /** 各分类的选中统计 */
  categoryStats: Record<FieldCategory, { selected: number; total: number }>;
  /** 是否有活跃的筛选（非默认状态） */
  hasCustomSelection: boolean;
  /** 已选字段数量 */
  selectedCount: number;
  /** 分类信息列表 */
  categories: typeof FIELD_CATEGORIES;
}

// ========== 存储 Key ==========

const STORAGE_KEY_PREFIX = 'panorama_columns';

function getStorageKey(platform: Platform, viewMode: string): string {
  return `${STORAGE_KEY_PREFIX}_${platform}_${viewMode}`;
}

// ========== Hook 实现 ==========

export function usePanoramaColumns(
  options: UsePanoramaColumnsOptions
): UsePanoramaColumnsReturn {
  const { platform, viewMode } = options;

  // 获取可用字段（根据平台和视角过滤）
  const availableFields = useMemo(() => {
    return getFieldsForViewMode(viewMode, platform);
  }, [platform, viewMode]);

  // 按分类分组
  const fieldsByCategory = useMemo(() => {
    return getFieldsGroupedByCategory(availableFields);
  }, [availableFields]);

  // 获取默认显示字段（考虑可用字段限制）
  const defaultFields = useMemo(() => {
    const availableIds = new Set(availableFields.map(f => f.id));
    return DEFAULT_VISIBLE_FIELDS.filter(id => availableIds.has(id));
  }, [availableFields]);

  // 从 localStorage 读取初始值
  const loadFromStorage = useCallback((): string[] => {
    try {
      const key = getStorageKey(platform, viewMode);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // 过滤掉不在可用字段中的
          const availableIds = new Set(availableFields.map(f => f.id));
          return parsed.filter(id => availableIds.has(id));
        }
      }
    } catch (e) {
      console.error('Failed to load panorama columns from localStorage:', e);
    }
    return defaultFields;
  }, [platform, viewMode, availableFields, defaultFields]);

  // 保存到 localStorage
  const saveToStorage = useCallback(
    (fields: string[]) => {
      try {
        const key = getStorageKey(platform, viewMode);
        localStorage.setItem(key, JSON.stringify(fields));
      } catch (e) {
        console.error('Failed to save panorama columns to localStorage:', e);
      }
    },
    [platform, viewMode]
  );

  // 选中字段状态 - 每次 key 变化时从 storage 重新加载
  const [selectedFields, setSelectedFieldsState] = useState<string[]>(() =>
    loadFromStorage()
  );

  // 跟踪上一次的 platform/viewMode，用于检测变化并同步 localStorage
  const prevKeyRef = useRef(`${platform}-${viewMode}`);

  // 当 platform 或 viewMode 变化时，重新从 localStorage 加载
  // 这是同步外部存储（localStorage）状态的正确使用场景
  useEffect(() => {
    const currentKey = `${platform}-${viewMode}`;
    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;
      const loaded = loadFromStorage();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFieldsState(loaded);
    }
  }, [platform, viewMode, loadFromStorage]);

  // 更新选中字段（带持久化）
  const setSelectedFields = useCallback(
    (fields: string[]) => {
      // 确保只保留可用字段
      const availableIds = new Set(availableFields.map(f => f.id));
      const validFields = fields.filter(id => availableIds.has(id));
      setSelectedFieldsState(validFields);
      saveToStorage(validFields);
    },
    [availableFields, saveToStorage]
  );

  // 切换单个字段（使用函数式更新避免闭包问题）
  const toggleField = useCallback(
    (fieldId: string) => {
      setSelectedFieldsState(prev => {
        const newFields = prev.includes(fieldId)
          ? prev.filter(id => id !== fieldId)
          : [...prev, fieldId];
        // 确保只保留可用字段
        const availableIds = new Set(availableFields.map(f => f.id));
        const validFields = newFields.filter(id => availableIds.has(id));
        saveToStorage(validFields);
        return validFields;
      });
    },
    [availableFields, saveToStorage]
  );

  // 选中分类下所有字段（使用函数式更新）
  const selectCategory = useCallback(
    (category: FieldCategory) => {
      const categoryFieldIds = fieldsByCategory[category].map(f => f.id);
      setSelectedFieldsState(prev => {
        const newFields = [...new Set([...prev, ...categoryFieldIds])];
        const availableIds = new Set(availableFields.map(f => f.id));
        const validFields = newFields.filter(id => availableIds.has(id));
        saveToStorage(validFields);
        return validFields;
      });
    },
    [fieldsByCategory, availableFields, saveToStorage]
  );

  // 取消选中分类下所有字段（使用函数式更新）
  const deselectCategory = useCallback(
    (category: FieldCategory) => {
      const categoryFieldIds = new Set(
        fieldsByCategory[category].map(f => f.id)
      );
      setSelectedFieldsState(prev => {
        const newFields = prev.filter(id => !categoryFieldIds.has(id));
        saveToStorage(newFields);
        return newFields;
      });
    },
    [fieldsByCategory, saveToStorage]
  );

  // 切换分类全选状态（使用函数式更新）
  const toggleCategory = useCallback(
    (category: FieldCategory) => {
      const categoryFieldIds = fieldsByCategory[category].map(f => f.id);
      setSelectedFieldsState(prev => {
        const allSelected = categoryFieldIds.every(id => prev.includes(id));
        const newFields = allSelected
          ? prev.filter(id => !categoryFieldIds.includes(id))
          : [...new Set([...prev, ...categoryFieldIds])];
        const availableIds = new Set(availableFields.map(f => f.id));
        const validFields = newFields.filter(id => availableIds.has(id));
        saveToStorage(validFields);
        return validFields;
      });
    },
    [fieldsByCategory, availableFields, saveToStorage]
  );

  // 恢复默认
  const resetToDefault = useCallback(() => {
    setSelectedFields(defaultFields);
  }, [defaultFields, setSelectedFields]);

  // 各分类的选中统计
  const categoryStats = useMemo(() => {
    const stats: Record<FieldCategory, { selected: number; total: number }> = {
      basic: { selected: 0, total: 0 },
      price: { selected: 0, total: 0 },
      rebate: { selected: 0, total: 0 },
      metrics: { selected: 0, total: 0 },
      audience: { selected: 0, total: 0 },
      aiFeatures: { selected: 0, total: 0 },
      prediction: { selected: 0, total: 0 },
      customer: { selected: 0, total: 0 },
    };

    const selectedSet = new Set(selectedFields);

    for (const [category, fields] of Object.entries(fieldsByCategory)) {
      stats[category as FieldCategory] = {
        total: fields.length,
        selected: fields.filter(f => selectedSet.has(f.id)).length,
      };
    }

    return stats;
  }, [fieldsByCategory, selectedFields]);

  // 是否有自定义选择
  const hasCustomSelection = useMemo(() => {
    if (selectedFields.length !== defaultFields.length) return true;
    const defaultSet = new Set(defaultFields);
    return !selectedFields.every(id => defaultSet.has(id));
  }, [selectedFields, defaultFields]);

  return {
    selectedFields,
    setSelectedFields,
    toggleField,
    selectCategory,
    deselectCategory,
    toggleCategory,
    resetToDefault,
    availableFields,
    fieldsByCategory,
    categoryStats,
    hasCustomSelection,
    selectedCount: selectedFields.length,
    categories: FIELD_CATEGORIES,
  };
}

export default usePanoramaColumns;
