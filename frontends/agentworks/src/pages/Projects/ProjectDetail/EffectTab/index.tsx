/**
 * EffectTab Module Exports
 * 导出所有效果验收 Tab 相关组件和 Hooks
 */

export { MetricCard } from './MetricCard';
export type { MetricCardProps } from './MetricCard';

export { ProgressSection } from './ProgressSection';
export type { ProgressSectionProps } from './ProgressSection';

export { useEffectData } from './useEffectData';
export type { UseEffectDataReturn } from './useEffectData';

export { useEffectCalculations } from './useEffectCalculations';
export type {
  EffectStats,
  CollaborationMetrics,
  EnrichedCollaboration,
} from './useEffectCalculations';

export { EffectTabNew } from './EffectTabNew';
export type { EffectTabNewProps } from './EffectTabNew';

// 默认导出新版本
export { EffectTabNew as default } from './EffectTabNew';
