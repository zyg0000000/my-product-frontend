/**
 * useEffectData - 效果数据加载 Hook
 * 负责从 API 获取效果数据
 */

import { useState, useEffect, useCallback } from 'react';
import type { Collaboration, EffectMetrics } from '../../../../types/project';
import type { EffectPeriod } from '../../../../types/projectConfig';
import { projectApi } from '../../../../services/projectApi';
import { logger } from '../../../../utils/logger';

/**
 * 数据库字段映射到前端字段
 * 数据库使用 totalViews/likeCount 等，前端类型使用 plays/likes 等
 */
/**
 * 计算总触达人数（从 reachByFrequency 对象中汇总）
 */
function calculateTotalReach(reachByFrequency: any): number | undefined {
  if (!reachByFrequency || typeof reachByFrequency !== 'object') {
    return undefined;
  }
  const total = Object.values(reachByFrequency).reduce(
    (sum: number, count) => sum + (Number(count) || 0),
    0
  );
  return total > 0 ? total : undefined;
}

function normalizeEffectData(data: any): EffectMetrics | undefined {
  if (!data) return undefined;

  return {
    plays: data.totalViews ?? data.plays,
    likes: data.likeCount ?? data.likes,
    comments: data.commentCount ?? data.comments,
    shares: data.shareCount ?? data.shares,
    // 组件相关
    componentImpressions:
      data.componentImpressionCount ?? data.componentImpressions,
    componentClicks: data.componentClickCount ?? data.componentClicks,
    // 完播率和触达
    completionRate: data.completionRate ?? data.videoCompletionRate,
    // 总触达人数：优先使用直接字段，否则从 reachByFrequency 计算
    reach:
      data.reach ?? data.totalReach ?? calculateTotalReach(data.reachByFrequency),
    // 保留其他字段
    cpm: data.cpm,
    cpe: data.cpe,
    gmv: data.gmv,
    roi: data.roi,
    conversions: data.conversions,
    recordedAt: data.recordedAt,
  };
}

export interface UseEffectDataReturn {
  collaborations: Collaboration[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useEffectData = (
  projectId: string,
  period: EffectPeriod
): UseEffectDataReturn => {
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('[useEffectData] Loading collaborations:', {
        projectId,
        period,
      });

      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500,
        status: '视频已发布',
      });

      if (response.success) {
        const items = response.data.items;

        // 转换字段名：数据库字段映射到前端类型
        const normalizedItems = items.map(item => ({
          ...item,
          effectData: item.effectData
            ? {
                t7: normalizeEffectData(item.effectData.t7),
                t21: normalizeEffectData(item.effectData.t21),
                t30: normalizeEffectData(item.effectData.t30),
              }
            : undefined,
        }));

        logger.debug('[useEffectData] Loaded collaborations:', {
          total: normalizedItems.length,
          withEffectData: normalizedItems.filter(c => c.effectData?.[period])
            .length,
        });
        setCollaborations(normalizedItems);
      } else {
        const errorMsg = '获取效果数据失败';
        logger.error('[useEffectData]', errorMsg);
        setError(errorMsg);
        setCollaborations([]);
      }
    } catch (err) {
      const errorMsg = '获取效果数据失败';
      logger.error('[useEffectData] Error loading data:', err);
      setError(errorMsg);
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    collaborations,
    loading,
    error,
    refresh: loadData,
  };
};
