/**
 * useEffectCalculations - 效果数据计算 Hook
 * 处理所有 CPM、CPE、互动率等指标计算
 */

import { useMemo } from 'react';
import type { Collaboration } from '../../../../types/project';
import type { EffectPeriod } from '../../../../types/projectConfig';
import { centsToYuan } from '../../../../types/project';

export interface EffectStats {
  totalViews: number;
  actualCPM: number;
  targetViews: number;
  viewsGap: number;
  achievementRate: number;
  totalInteractions: number;
  avgInteractionRate: number;
  avgLikeToViewRatio: number;
}

export interface CollaborationMetrics {
  totalInteractions: number;
  interactionRate: number;
  likeToViewRatio: number;
  cpm: number;
  cpe: number;
  ctr: number;
}

export interface EnrichedCollaboration extends Collaboration {
  metrics?: CollaborationMetrics;
}

/**
 * 计算项目级汇总统计
 */
export const calculateEffectStats = (
  collaborations: Collaboration[],
  period: EffectPeriod,
  benchmarkCPM: number
): EffectStats => {
  // 过滤：仅"视频已发布"且有 effectData 的记录
  const validCollabs = collaborations.filter(
    c => c.status === '视频已发布' && c.effectData?.[period]
  );

  // 总播放量
  const totalViews = validCollabs.reduce(
    (sum, c) => sum + (c.effectData![period]!.plays || 0),
    0
  );

  // 总收入（对客报价，单位：分）
  // AgentWorks 中 CPM 应该基于收入计算，而不是成本
  const totalRevenue = validCollabs.reduce(
    (sum, c) => sum + (c.finance?.revenue || c.amount || 0),
    0
  );

  // 总互动量
  const totalInteractions = validCollabs.reduce((sum, c) => {
    const effect = c.effectData?.[period];
    if (!effect) return sum;
    return (
      sum + (effect.likes || 0) + (effect.comments || 0) + (effect.shares || 0)
    );
  }, 0);

  // 实际 CPM = (总收入 / 总播放量) * 1000
  const actualCPM =
    totalViews > 0 ? (centsToYuan(totalRevenue) / totalViews) * 1000 : 0;

  // 目标播放量 = 总收入 / 目标CPM * 1000
  const targetViews =
    benchmarkCPM > 0 ? (centsToYuan(totalRevenue) / benchmarkCPM) * 1000 : 0;

  // 播放量差值
  const viewsGap = totalViews - targetViews;

  // 达成率
  const achievementRate =
    targetViews > 0 ? (totalViews / targetViews) * 100 : 0;

  // 平均互动率
  const avgInteractionRate =
    totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

  // 平均赞播比
  const totalLikes = validCollabs.reduce(
    (sum, c) => sum + (c.effectData?.[period]?.likes || 0),
    0
  );
  const avgLikeToViewRatio =
    totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

  return {
    totalViews,
    actualCPM,
    targetViews,
    viewsGap,
    achievementRate,
    totalInteractions,
    avgInteractionRate,
    avgLikeToViewRatio,
  };
};

/**
 * 计算单条记录的指标
 */
export const calculateCollaborationMetrics = (
  collab: Collaboration,
  period: EffectPeriod
): CollaborationMetrics | null => {
  const effect = collab.effectData?.[period];
  if (!effect) return null;

  const plays = effect.plays || 0;
  const likes = effect.likes || 0;
  const comments = effect.comments || 0;
  const shares = effect.shares || 0;
  // AgentWorks 中使用收入（对客报价）计算 CPM/CPE，而不是成本
  const revenue = collab.finance?.revenue || collab.amount || 0; // 单位：分

  // 总互动量
  const totalInteractions = likes + comments + shares;

  // 互动率
  const interactionRate = plays > 0 ? (totalInteractions / plays) * 100 : 0;

  // 赞播比
  const likeToViewRatio = plays > 0 ? (likes / plays) * 100 : 0;

  // CPM = (收入 / 播放量) * 1000
  const cpm = plays > 0 ? (centsToYuan(revenue) / plays) * 1000 : 0;

  // CPE = 收入 / 总互动量
  const cpe =
    totalInteractions > 0 ? centsToYuan(revenue) / totalInteractions : 0;

  // 组件点击率 CTR = 组件点击量 / 组件展示量 * 100
  const ctr =
    (effect.componentImpressions || 0) > 0
      ? ((effect.componentClicks || 0) / effect.componentImpressions!) * 100
      : 0;

  return {
    totalInteractions,
    interactionRate,
    likeToViewRatio,
    cpm,
    cpe,
    ctr,
  };
};

/**
 * Effect Calculations Hook
 */
export const useEffectCalculations = (
  collaborations: Collaboration[],
  period: EffectPeriod,
  benchmarkCPM: number
) => {
  const stats = useMemo(() => {
    return calculateEffectStats(collaborations, period, benchmarkCPM);
  }, [collaborations, period, benchmarkCPM]);

  const enrichedCollaborations = useMemo(() => {
    return collaborations.map(c => ({
      ...c,
      metrics: calculateCollaborationMetrics(c, period),
    }));
  }, [collaborations, period]);

  return {
    stats,
    collaborations: enrichedCollaborations as EnrichedCollaboration[],
  };
};
