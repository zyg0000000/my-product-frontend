/**
 * 筛选模块注册导出
 *
 * 所有可用的筛选模块：
 * - BasicInfoModule: 基础信息筛选
 * - CustomerTagModule: 客户标签筛选（带联动）
 * - PerformanceModule: 表现数据筛选（配置驱动）
 *
 * 未来扩展模块（待实现）：
 * - ProjectModule: 项目维度筛选
 * - EffectModule: 合作效果筛选
 */

import { BasicInfoModule } from './BasicInfoModule';
import { CustomerTagModule } from './CustomerTagModule';
import { PerformanceModule } from './PerformanceModule';
import type { FilterModule } from '../../types/filterModule';

// 导出各模块
export { BasicInfoModule } from './BasicInfoModule';
export { CustomerTagModule } from './CustomerTagModule';
export { PerformanceModule } from './PerformanceModule';

/**
 * 全部可用筛选模块列表
 */
export const ALL_FILTER_MODULES: FilterModule[] = [
  BasicInfoModule,
  CustomerTagModule,
  PerformanceModule,
];

/**
 * 获取默认启用的筛选模块
 */
export function getDefaultModules(): FilterModule[] {
  return ALL_FILTER_MODULES.filter(m => m.enabled);
}

/**
 * 根据 ID 获取筛选模块
 */
export function getModuleById(id: string): FilterModule | undefined {
  return ALL_FILTER_MODULES.find(m => m.id === id);
}

/**
 * 创建自定义模块组合
 */
export function createModuleRegistry(moduleIds: string[]): FilterModule[] {
  return moduleIds
    .map(getModuleById)
    .filter((m): m is FilterModule => m !== undefined)
    .sort((a, b) => a.order - b.order);
}
