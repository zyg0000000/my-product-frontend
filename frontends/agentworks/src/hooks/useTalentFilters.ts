/**
 * 达人筛选状态管理 Hook
 *
 * 提供筛选条件的状态管理和更新方法
 * 简化组件代码，提升可维护性
 */

import { useState } from 'react';
import type { TalentFilters } from '../utils/talentFilters';
import { EMPTY_FILTERS, validateFilters } from '../utils/talentFilters';

/**
 * 筛选状态管理 Hook
 */
export function useTalentFilters() {
  const [filters, setFilters] = useState<TalentFilters>(EMPTY_FILTERS);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * 更新筛选条件（部分更新）
   */
  const updateFilters = (updates: Partial<TalentFilters>) => {
    const newFilters = { ...filters, ...updates };

    // 验证新的筛选条件
    const error = validateFilters(newFilters);
    setValidationError(error);

    // 即使有验证错误也更新状态（让用户看到错误提示）
    setFilters(newFilters);
  };

  /**
   * 重置所有筛选条件
   */
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setValidationError(null);
  };

  /**
   * 更新搜索词
   */
  const setSearchTerm = (searchTerm: string) => {
    updateFilters({ searchTerm });
  };

  /**
   * 切换层级选择
   */
  const toggleTier = (tier: string) => {
    const newTiers = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier];
    updateFilters({ tiers: newTiers });
  };

  /**
   * 切换标签选择
   */
  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  /**
   * 设置返点率区间
   */
  const setRebateRange = (min: string, max: string) => {
    updateFilters({ rebateRange: [min, max] });
  };

  /**
   * 设置价格区间
   */
  const setPriceRange = (min: string, max: string) => {
    updateFilters({ priceRange: [min, max] });
  };

  /**
   * 切换价格档位选择
   */
  const togglePriceTier = (tier: string) => {
    const newTiers = filters.priceTiers.includes(tier)
      ? filters.priceTiers.filter(t => t !== tier)
      : [...filters.priceTiers, tier];
    updateFilters({ priceTiers: newTiers });
  };

  return {
    filters,
    validationError,
    updateFilters,
    resetFilters,
    setSearchTerm,
    toggleTier,
    toggleTag,
    setRebateRange,
    setPriceRange,
    togglePriceTier,
  };
}
