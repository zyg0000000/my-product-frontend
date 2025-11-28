/**
 * 达人筛选工具模块
 *
 * 提供筛选参数的构建、验证和管理功能
 * 从 BasicInfo.tsx 中提取，提升可测试性和可维护性
 */

/**
 * 筛选条件接口
 */
export interface TalentFilters {
  searchTerm: string;
  tiers: string[]; // 达人层级
  tags: string[]; // 内容标签
  rebateRange: [string, string]; // 返点率区间 [min, max]，空字符串表示不限
  priceRange: [string, string]; // 价格区间 [min, max]，空字符串表示不限
  priceTiers: string[]; // 价格档位
}

/**
 * 空筛选条件（默认值）
 */
export const EMPTY_FILTERS: TalentFilters = {
  searchTerm: '',
  tiers: [],
  tags: [],
  rebateRange: ['', ''],
  priceRange: ['', ''],
  priceTiers: [],
};

/**
 * 构建 API 查询参数
 * 将前端筛选状态转换为后端 API 参数
 */
export function buildFilterParams(filters: TalentFilters) {
  const params: any = {};

  // 搜索词
  if (filters.searchTerm.trim()) {
    params.searchTerm = filters.searchTerm.trim();
  }

  // 层级筛选
  if (filters.tiers.length > 0) {
    params.tiers = filters.tiers;
  }

  // 标签筛选
  if (filters.tags.length > 0) {
    params.tags = filters.tags;
  }

  // 返点率筛选
  const [rebateMin, rebateMax] = filters.rebateRange;
  if (rebateMin.trim()) {
    params.rebateMin = parseFloat(rebateMin);
  }
  if (rebateMax.trim()) {
    params.rebateMax = parseFloat(rebateMax);
  }

  // 价格筛选
  const [priceMin, priceMax] = filters.priceRange;
  if (priceMin.trim()) {
    params.priceMin = parseFloat(priceMin);
  }
  if (priceMax.trim()) {
    params.priceMax = parseFloat(priceMax);
  }

  // 价格档位筛选
  if (filters.priceTiers.length > 0) {
    params.priceTiers = filters.priceTiers;
  }

  return params;
}

/**
 * 验证筛选条件
 * @returns 错误信息，如果验证通过则返回 null
 */
export function validateFilters(filters: TalentFilters): string | null {
  const [rebateMin, rebateMax] = filters.rebateRange;
  const [priceMin, priceMax] = filters.priceRange;

  // 验证返点率区间
  if (rebateMin && rebateMax) {
    const min = parseFloat(rebateMin);
    const max = parseFloat(rebateMax);

    if (isNaN(min) || isNaN(max)) {
      return '返点率必须是有效的数字';
    }

    if (min < 0 || max < 0) {
      return '返点率不能为负数';
    }

    if (min > 100 || max > 100) {
      return '返点率不能超过 100%';
    }

    if (min > max) {
      return '返点率最小值不能大于最大值';
    }
  }

  // 验证价格区间
  if (priceMin && priceMax) {
    const min = parseFloat(priceMin);
    const max = parseFloat(priceMax);

    if (isNaN(min) || isNaN(max)) {
      return '价格必须是有效的数字';
    }

    if (min < 0 || max < 0) {
      return '价格不能为负数';
    }

    if (min > max) {
      return '价格最小值不能大于最大值';
    }
  }

  return null;
}

/**
 * 检查筛选条件是否为空
 */
export function isFiltersEmpty(filters: TalentFilters): boolean {
  return (
    !filters.searchTerm.trim() &&
    filters.tiers.length === 0 &&
    filters.tags.length === 0 &&
    !filters.rebateRange[0].trim() &&
    !filters.rebateRange[1].trim() &&
    !filters.priceRange[0].trim() &&
    !filters.priceRange[1].trim() &&
    filters.priceTiers.length === 0
  );
}

/**
 * 统计激活的筛选条件数量
 */
export function countActiveFilters(filters: TalentFilters): number {
  let count = 0;

  if (filters.searchTerm.trim()) count++;
  if (filters.tiers.length > 0) count++;
  if (filters.tags.length > 0) count++;
  if (filters.rebateRange[0].trim() || filters.rebateRange[1].trim()) count++;
  if (filters.priceRange[0].trim() || filters.priceRange[1].trim()) count++;
  if (filters.priceTiers.length > 0) count++;

  return count;
}

/**
 * 重置筛选条件
 */
export function resetFilters(): TalentFilters {
  return { ...EMPTY_FILTERS };
}

/**
 * 更新筛选条件（部分更新）
 */
export function updateFilters(
  current: TalentFilters,
  updates: Partial<TalentFilters>
): TalentFilters {
  return { ...current, ...updates };
}
