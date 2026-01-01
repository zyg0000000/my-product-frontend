/**
 * EffectTab - 效果验收 Tab (兼容层)
 * @version 4.0.0
 *
 * 本文件为向后兼容层,重新导出新版本组件
 * 旧版本已备份至 EffectTab.v3.backup.tsx
 *
 * @changelog
 * - v4.0.0 (2025-12-29): 全新玻璃态设计,仅支持 T+7/T+21
 * - v3.0.0 (2025-12-11): 动态指标配置 (已备份)
 * - v2.0.0 (2025-12-11): 动态列渲染
 * - v1.0.0: 初始版本
 */

import { EffectTabNew } from './EffectTab/EffectTabNew';
import type { EffectTabNewProps } from './EffectTab/EffectTabNew';
import type { EffectTabConfig } from '../../../types/projectConfig';

/**
 * EffectTab Props (兼容旧版本接口)
 */
export interface EffectTabProps extends Omit<
  EffectTabNewProps,
  'benchmarkCPM'
> {
  /** 客户自定义效果配置 (v3.0.0 特性,新版本暂不支持) */
  effectConfig?: EffectTabConfig;
  /** 基准 CPM */
  benchmarkCPM?: number;
}

/**
 * EffectTab 组件
 * 兼容旧版本 API,内部使用新版本实现
 */
export function EffectTab({
  projectId,
  projectName,
  platforms,
  benchmarkCPM = 10,
  effectConfig: _effectConfig, // 暂时忽略,新版本不支持动态配置
  onRefresh,
}: EffectTabProps) {
  // 简单的兼容层,直接传递给新组件
  // 确保 benchmarkCPM 有有效值（如果为 null/undefined，使用默认值 10）
  const validBenchmarkCPM = benchmarkCPM ?? 10;

  return (
    <EffectTabNew
      projectId={projectId}
      projectName={projectName}
      platforms={platforms}
      benchmarkCPM={validBenchmarkCPM}
      onRefresh={onRefresh}
    />
  );
}

export default EffectTab;
