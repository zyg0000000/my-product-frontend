/**
 * 合作达人表单 Hook
 *
 * 封装添加/编辑合作达人的业务逻辑：
 * - 达人搜索
 * - 价格计算和来源追踪
 * - 返点率获取和来源追踪
 * - 表单提交
 */

import { useState, useCallback, useRef } from 'react';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import type { Platform, PriceRecord } from '../types/talent';
import type {
  Collaboration,
  CreateCollaborationRequest,
  TalentSource,
} from '../types/project';
import { yuanToCents } from '../types/project';
import { projectApi } from '../services/projectApi';
import {
  talentApi,
  type TalentListItem,
  AGENCY_INDIVIDUAL_ID,
} from '../services/talentApi';
import { usePlatformConfig } from './usePlatformConfig';
import { useApiCall } from './useApiCall';
import { getTalentRebate } from '../api/rebate';
import { REBATE_SOURCE_LABELS } from '../types/rebate';
import { logger } from '../utils/logger';

/**
 * 达人选项（用于下拉列表）
 */
export interface TalentOption {
  value: string;
  label: string;
  platform: Platform;
  talent: TalentListItem;
}

/**
 * Tooltip 信息
 */
export interface TooltipInfo {
  price: string;
  rebate: string;
}

/**
 * 价格类型标签映射
 */
const PRICE_TYPE_LABELS: Record<string, string> = {
  video_60plus: '60s+视频',
  video_20_60: '20-60s视频',
  video_1_20: '1-20s视频',
  live: '直播',
  image: '图文',
};

/**
 * Hook 参数
 */
interface UseCollaborationFormParams {
  form: FormInstance;
  projectId: string;
  customerId: string; // v2.1: 用于获取客户级返点
  editingCollaboration: Collaboration | null;
  onSuccess: () => void;
}

/**
 * 合作达人表单 Hook
 */
export function useCollaborationForm({
  form,
  projectId,
  customerId,
  editingCollaboration,
  onSuccess,
}: UseCollaborationFormParams) {
  // 平台配置 - 使用 ref 存储以避免循环依赖
  const { getPlatformNames } = usePlatformConfig();
  const platformNamesRef = useRef<Record<string, string>>({});
  platformNamesRef.current = getPlatformNames();

  // API 调用
  const createApi = useApiCall();
  const updateApi = useApiCall();

  // 达人搜索状态
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentOptions, setTalentOptions] = useState<TalentOption[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | ''>('');

  // Tooltip 信息
  const [tooltips, setTooltips] = useState<TooltipInfo>({
    price: '',
    rebate: '',
  });

  const isEdit = !!editingCollaboration;

  /**
   * 获取最新价格和来源信息
   */
  const getLatestPrice = useCallback(
    (prices?: PriceRecord[]): { price: number | null; tooltip: string } => {
      if (!prices || prices.length === 0) {
        return { price: null, tooltip: '' };
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // 按年月降序排序
      const sortedPrices = [...prices].sort((a, b) => {
        const dateA = a.year * 100 + a.month;
        const dateB = b.year * 100 + b.month;
        return dateB - dateA;
      });

      // 生成价格来源描述
      const formatTooltip = (p: PriceRecord): string => {
        const typeLabel = PRICE_TYPE_LABELS[p.type] || p.type;
        return `来源：${p.year}年${p.month}月 ${typeLabel} 报价`;
      };

      // 优先找当月的 60s+ 视频价格
      const currentMonthPrice = sortedPrices.find(
        p =>
          p.year === currentYear &&
          p.month === currentMonth &&
          p.type === 'video_60plus'
      );
      if (currentMonthPrice) {
        return {
          price: currentMonthPrice.price / 100,
          tooltip: formatTooltip(currentMonthPrice),
        };
      }

      // 找最近的 60s+ 视频价格
      const latestPrice = sortedPrices.find(p => p.type === 'video_60plus');
      if (latestPrice) {
        return {
          price: latestPrice.price / 100,
          tooltip: formatTooltip(latestPrice),
        };
      }

      // 取任意最新价格
      const anyPrice = sortedPrices[0];
      return anyPrice
        ? { price: anyPrice.price / 100, tooltip: formatTooltip(anyPrice) }
        : { price: null, tooltip: '' };
    },
    []
  );

  /**
   * 根据机构ID判断达人来源
   */
  const getTalentSource = useCallback((agencyId?: string): TalentSource => {
    if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
      return '独立达人';
    }
    return '机构达人';
  }, []);

  /**
   * 搜索达人
   */
  const searchTalents = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setTalentOptions([]);
        return;
      }

      try {
        setTalentLoading(true);
        const response = await talentApi.getTalents({
          page: 1,
          pageSize: 30,
          keyword: searchTerm,
          platform: selectedPlatform || undefined,
        });

        if (response.success) {
          const options: TalentOption[] = response.data.items.map(
            (t: TalentListItem) => ({
              value: `${t.oneId}__${t.platform}`,
              label: `${t.nickname || t.oneId} (${platformNamesRef.current[t.platform] || t.platform})`,
              platform: t.platform,
              talent: t,
            })
          );
          setTalentOptions(options);
        }
      } catch (error) {
        logger.error('Error searching talents:', error);
      } finally {
        setTalentLoading(false);
      }
    },
    [selectedPlatform]
  );

  /**
   * 达人选择变化 - 自动填充表单
   * v2.1: 使用新 API 获取客户级返点
   */
  const handleTalentChange = useCallback(
    async (value: string) => {
      const [oneId, platform] = value.split('__');
      const selectedOption = talentOptions.find(opt => opt.value === value);
      const talent = selectedOption?.talent;

      // 基础字段
      const updates: Record<string, unknown> = {
        talentOneId: oneId,
        talentPlatform: platform,
      };

      // 重置 tooltip
      const newTooltips: TooltipInfo = { price: '', rebate: '' };

      if (talent) {
        // 自动填充达人来源
        updates.talentSource = getTalentSource(talent.agencyId);

        // v2.1: 使用新 API 获取生效返点（考虑客户级返点）
        try {
          const rebateResponse = await getTalentRebate(
            oneId,
            platform as Platform,
            customerId
          );
          if (rebateResponse.success && rebateResponse.data) {
            const { effectiveRebate, customerRebate } = rebateResponse.data;
            if (effectiveRebate) {
              updates.rebateRate = effectiveRebate.rate;
              const sourceLabel =
                REBATE_SOURCE_LABELS[
                  effectiveRebate.source as keyof typeof REBATE_SOURCE_LABELS
                ] || effectiveRebate.source;

              // 构建返点来源提示
              if (effectiveRebate.source === 'customer' && customerRebate) {
                newTooltips.rebate = `来源：${sourceLabel}\n生效日期：${customerRebate.effectiveDate || '未知'}`;
              } else if (rebateResponse.data.currentRebate) {
                const effectiveDate = rebateResponse.data.currentRebate
                  .effectiveDate
                  ? dayjs(
                      rebateResponse.data.currentRebate.effectiveDate
                    ).format('YYYY-MM-DD')
                  : '未知';
                newTooltips.rebate = `来源：${sourceLabel}\n生效日期：${effectiveDate}`;
              } else {
                newTooltips.rebate = `来源：${sourceLabel}`;
              }
            }
          }
        } catch (error) {
          logger.error('获取返点信息失败，使用达人默认返点:', error);
          // 降级：使用达人的 currentRebate
          if (talent.currentRebate?.rate !== undefined) {
            updates.rebateRate = talent.currentRebate.rate;
            const effectiveDate = talent.currentRebate.effectiveDate
              ? dayjs(talent.currentRebate.effectiveDate).format('YYYY-MM-DD')
              : '未知';
            newTooltips.rebate = `来源：达人返点配置\n生效日期：${effectiveDate}`;
          }
        }

        // 自动填充价格和来源信息
        const priceResult = getLatestPrice(talent.prices);
        if (priceResult.price !== null) {
          updates.amount = priceResult.price;
          newTooltips.price = priceResult.tooltip;
        }
      }

      form.setFieldsValue(updates);
      setSelectedPlatform(platform as Platform);
      setTooltips(newTooltips);
    },
    [talentOptions, getTalentSource, getLatestPrice, form, customerId]
  );

  /**
   * 初始化表单（编辑模式）
   */
  const initializeForm = useCallback(() => {
    if (editingCollaboration) {
      form.setFieldsValue({
        talentSelect: `${editingCollaboration.talentOneId}__${editingCollaboration.talentPlatform}`,
        talentOneId: editingCollaboration.talentOneId,
        talentPlatform: editingCollaboration.talentPlatform,
        talentSource: editingCollaboration.talentSource,
        status: editingCollaboration.status,
        amount: editingCollaboration.amount / 100, // 分转元
        rebateRate: editingCollaboration.rebateRate,
        plannedReleaseDate: editingCollaboration.plannedReleaseDate
          ? dayjs(editingCollaboration.plannedReleaseDate)
          : undefined,
        actualReleaseDate: editingCollaboration.actualReleaseDate
          ? dayjs(editingCollaboration.actualReleaseDate)
          : undefined,
        taskId: editingCollaboration.taskId,
        videoId: editingCollaboration.videoId,
        videoUrl: editingCollaboration.videoUrl,
      });

      // 设置达人选项
      setTalentOptions([
        {
          value: `${editingCollaboration.talentOneId}__${editingCollaboration.talentPlatform}`,
          label: `${editingCollaboration.talentName || editingCollaboration.talentOneId} (${platformNamesRef.current[editingCollaboration.talentPlatform] || editingCollaboration.talentPlatform})`,
          platform: editingCollaboration.talentPlatform,
          talent: {} as TalentListItem,
        },
      ]);
      setSelectedPlatform(editingCollaboration.talentPlatform);
    } else {
      // 新建模式：设置默认值
      form.setFieldsValue({ status: '待提报工作台' });
      setTalentOptions([]);
      setSelectedPlatform('');
    }
    setTooltips({ price: '', rebate: '' });
  }, [editingCollaboration, form]);

  /**
   * 重置表单
   */
  const resetForm = useCallback(() => {
    form.resetFields();
    setTalentOptions([]);
    setSelectedPlatform('');
    setTooltips({ price: '', rebate: '' });
  }, [form]);

  /**
   * 提交表单
   */
  const handleSubmit = useCallback(async () => {
    const values = await form.validateFields();

    if (isEdit && editingCollaboration) {
      // 更新
      const response = await updateApi.execute(
        () =>
          projectApi.updateCollaboration(editingCollaboration.id, {
            status: values.status,
            amount: yuanToCents(values.amount),
            plannedReleaseDate: values.plannedReleaseDate?.format('YYYY-MM-DD'),
            actualReleaseDate: values.actualReleaseDate?.format('YYYY-MM-DD'),
            taskId: values.taskId,
            videoId: values.videoId,
            videoUrl: values.videoUrl,
          }),
        {
          successMessage: '更新成功',
          onSuccess: () => {
            resetForm();
            onSuccess();
          },
        }
      );
      return response !== null;
    } else {
      // 创建
      const data: CreateCollaborationRequest = {
        projectId,
        talentOneId: values.talentOneId,
        talentPlatform: values.talentPlatform,
        amount: yuanToCents(values.amount),
        plannedReleaseDate: values.plannedReleaseDate?.format('YYYY-MM-DD'),
        rebateRate: values.rebateRate,
        talentSource: values.talentSource,
      };

      const response = await createApi.execute(
        () => projectApi.createCollaboration(data),
        {
          successMessage: '添加成功',
          onSuccess: () => {
            resetForm();
            onSuccess();
          },
        }
      );
      return response !== null;
    }
  }, [
    form,
    isEdit,
    editingCollaboration,
    projectId,
    createApi,
    updateApi,
    resetForm,
    onSuccess,
  ]);

  return {
    // 状态
    isEdit,
    talentLoading,
    talentOptions,
    selectedPlatform,
    tooltips,
    loading: createApi.loading || updateApi.loading,

    // 平台配置
    platformNames: platformNamesRef.current,

    // 方法
    searchTalents,
    handleTalentChange,
    setSelectedPlatform,
    initializeForm,
    resetForm,
    handleSubmit,
  };
}
