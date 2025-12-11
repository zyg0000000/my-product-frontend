/**
 * 达人 API 服务
 * 封装 api/talent.ts 的功能，提供统一接口
 */

import { searchTalents, type SearchTalentsParams } from '../api/talent';
import type {
  Platform,
  Talent,
  PriceRecord,
  CurrentRebate,
} from '../types/talent';
import { logger } from '../utils/logger';

/**
 * 野生达人机构ID常量
 */
export const AGENCY_INDIVIDUAL_ID = 'individual';

/**
 * 达人列表项（包含价格和返点信息）
 */
export interface TalentListItem {
  oneId: string;
  platform: Platform;
  nickname?: string;
  name?: string;
  platformAccountId?: string;
  fansCount?: number;
  agencyId?: string; // 机构ID
  prices?: PriceRecord[]; // 价格记录
  currentRebate?: CurrentRebate; // 当前返点配置
}

/**
 * 获取达人列表参数
 */
export interface GetTalentsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  platform?: Platform;
}

/**
 * 达人列表响应
 */
export interface GetTalentsResponse {
  success: boolean;
  data: {
    items: TalentListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  message?: string;
}

/**
 * 达人 API 服务类
 */
class TalentApiService {
  /**
   * 获取达人列表（用于搜索选择）
   */
  async getTalents(params: GetTalentsParams): Promise<GetTalentsResponse> {
    try {
      const searchParams: SearchTalentsParams = {
        page: params.page || 1,
        pageSize: params.pageSize || 30,
        search: params.keyword,
        platform: params.platform,
      };

      const response = await searchTalents(searchParams);

      if (response.success && response.data) {
        const items: TalentListItem[] = response.data.talents.map(
          (t: Talent) => ({
            oneId: t.oneId,
            platform: t.platform,
            nickname: t.name, // Talent 类型使用 name 字段
            name: t.name,
            platformAccountId: t.platformAccountId,
            fansCount: t.fansCount,
            agencyId: t.agencyId,
            prices: t.prices,
            currentRebate: t.currentRebate,
          })
        );

        return {
          success: true,
          data: {
            items,
            total: response.data.pagination.totalItems,
            page: response.data.pagination.page,
            pageSize: response.data.pagination.pageSize,
          },
        };
      }

      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 30 },
        message: response.message || '获取达人列表失败',
      };
    } catch (error) {
      logger.error('Error fetching talents:', error);
      return {
        success: false,
        data: { items: [], total: 0, page: 1, pageSize: 30 },
        message: '获取达人列表失败',
      };
    }
  }
}

export const talentApi = new TalentApiService();
