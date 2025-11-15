/**
 * 统计数据相关 API
 */

import { post } from './client';

/**
 * 统计数据响应类型
 */
export interface TalentStatsResponse {
  success: boolean;
  dbVersion: string;
  data: {
    totalRecords: number;
    uniqueTalents: number;
    platformStats: {
      douyin: number;
      xiaohongshu: number;
      bilibili: number;
      kuaishou: number;
    };
    statusStats: {
      active?: number;
      inactive?: number;
      archived?: number;
      [key: string]: number | undefined;
    };
    tierStats: {
      头部?: number;
      腰部?: number;
      尾部?: number;
      [key: string]: number | undefined;
    };
    typeStats: Array<{
      type: string;
      count: number;
    }>;
  };
  timestamp: string;
}

/**
 * 获取达人统计数据
 * 使用 POST 请求以避免 GET 查询参数限制
 */
export async function getTalentStats(): Promise<TalentStatsResponse> {
  return post('/getTalentStats', {});
}
