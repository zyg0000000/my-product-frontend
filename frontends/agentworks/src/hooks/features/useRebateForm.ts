/**
 * 返点表单管理 Hook
 *
 * 抽离自 RebateManagementModal，负责：
 * - 返点数据加载
 * - 表单状态管理
 * - 表单验证和提交
 * - 分页逻辑
 */

import { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  getTalentRebate,
  getRebateHistory as fetchRebateHistory,
  updateTalentRebate,
  syncAgencyRebateToTalent,
} from '../../api/rebate';
import { getAgencies } from '../../api/agency';
import type { Talent } from '../../types/talent';
import type { Agency } from '../../types/agency';
import type {
  GetRebateResponse,
  RebateConfig,
  EffectType,
  UpdateRebateRequest,
} from '../../types/rebate';
import { validateRebateRate } from '../../types/rebate';
import { AGENCY_INDIVIDUAL_ID } from '../../types/agency';

export type TabType =
  | 'current'
  | 'manual'
  | 'agencySync'
  | 'stepRule'
  | 'history';

interface UseRebateFormParams {
  talent: Talent;
  isOpen: boolean;
}

/**
 * 返点表单管理 Hook
 */
export function useRebateForm({ talent, isOpen }: UseRebateFormParams) {
  // ==================== 数据状态 ====================
  const [rebateData, setRebateData] = useState<
    GetRebateResponse['data'] | null
  >(null);
  const [rebateHistory, setRebateHistory] = useState<RebateConfig[]>([]);
  const [rebateLoading, setRebateLoading] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  // ==================== UI 状态 ====================
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [rebateMode, setRebateMode] = useState<'sync' | 'independent'>('sync');

  // ==================== 手动调整表单状态 ====================
  const [manualRebateRate, setManualRebateRate] = useState<string>('');
  const [manualEffectType, setManualEffectType] =
    useState<EffectType>('immediate');
  const [manualCreatedBy, setManualCreatedBy] = useState<string>('');
  const [manualLoading, setManualLoading] = useState(false);

  // ==================== 机构同步状态 ====================
  const [syncLoading, setSyncLoading] = useState(false);

  // ==================== 消息提示状态 ====================
  const [manualError, setManualError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // ==================== 分页状态 ====================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 3;

  // ==================== 初始化：Modal 打开时加载数据 ====================
  useEffect(() => {
    if (isOpen) {
      loadRebateData();
      loadAgencies();
      // 重置表单和消息
      setManualError('');
      setSuccessMessage('');
    }
  }, [isOpen, talent.oneId, talent.platform]);

  // ==================== 初始化：设置手动调整的默认值 ====================
  useEffect(() => {
    if (rebateData?.currentRebate?.rate !== undefined) {
      setManualRebateRate(rebateData.currentRebate.rate.toString());
    }
  }, [rebateData]);

  // ==================== 数据加载函数 ====================

  /**
   * 加载返点数据和历史记录
   */
  const loadRebateData = async (page: number = 1) => {
    try {
      setRebateLoading(true);

      // 加载当前返点配置
      const rebateResponse = await getTalentRebate(
        talent.oneId,
        talent.platform
      );
      if (rebateResponse.success && rebateResponse.data) {
        setRebateData(rebateResponse.data);
        setRebateMode(rebateResponse.data.rebateMode);
      }

      // 加载返点历史记录（分页）
      const offset = (page - 1) * pageSize;
      const historyResponse = await fetchRebateHistory({
        oneId: talent.oneId,
        platform: talent.platform,
        limit: pageSize,
        offset,
      });
      if (historyResponse.success && historyResponse.data) {
        setRebateHistory(historyResponse.data.records);
        setTotalRecords(historyResponse.data.total);
        setCurrentPage(page);
      }
    } catch (error) {
      logger.error('加载返点数据失败:', error);
    } finally {
      setRebateLoading(false);
    }
  };

  /**
   * 加载机构列表
   */
  const loadAgencies = async () => {
    try {
      const response = await getAgencies({ status: 'active' });
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      logger.error('加载机构列表失败:', error);
    }
  };

  // ==================== 工具函数 ====================

  /**
   * 获取机构名称
   */
  const getAgencyName = (agencyId: string | null | undefined): string => {
    if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
      return '野生达人';
    }
    const agency = agencies.find(a => a.id === agencyId);
    return agency?.name || agencyId;
  };

  // ==================== 分页处理 ====================

  const totalPages = Math.ceil(totalRecords / pageSize);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadRebateData(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadRebateData(currentPage + 1);
    }
  };

  // ==================== 返点模式切换 ====================

  const handleToggleMode = () => {
    setRebateMode(prev => (prev === 'sync' ? 'independent' : 'sync'));
    setManualError('');
  };

  // ==================== 机构同步 ====================

  const handleSyncFromAgency = async () => {
    try {
      setSyncLoading(true);
      setManualError('');
      setSuccessMessage('');

      const response = await syncAgencyRebateToTalent({
        oneId: talent.oneId,
        platform: talent.platform,
        changeMode: rebateMode !== 'sync',
        createdBy: manualCreatedBy || undefined,
      });

      if (response.success) {
        // 如果切换了模式，更新本地状态
        if (rebateMode !== 'sync') {
          setRebateMode('sync');
        }
        // 重新加载数据
        await loadRebateData(currentPage);
        setSuccessMessage('同步成功！返点率已更新');
        // 3秒后自动清除成功消息
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setManualError(response.message || '同步失败');
      }
    } catch (err: any) {
      setManualError(err.message || '同步机构返点失败');
    } finally {
      setSyncLoading(false);
    }
  };

  // ==================== 手动调整提交 ====================

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    setSuccessMessage('');

    // 验证返点率
    const rateNum = parseFloat(manualRebateRate);
    const validation = validateRebateRate(rateNum);
    if (!validation.valid) {
      setManualError(validation.error || '返点率格式错误');
      return;
    }

    try {
      setManualLoading(true);

      const request: UpdateRebateRequest = {
        oneId: talent.oneId,
        platform: talent.platform,
        rebateRate: rateNum,
        effectType: manualEffectType,
        createdBy: manualCreatedBy || undefined,
      };

      const response = await updateTalentRebate(request);

      if (response.success) {
        // 手动调整后，如果原来是sync模式，自动切换到independent
        if (rebateMode === 'sync') {
          setRebateMode('independent');
        }
        // 重新加载数据
        await loadRebateData(currentPage);
        setSuccessMessage('返点调整成功！新返点率已生效');
        // 3秒后自动清除成功消息
        setTimeout(() => setSuccessMessage(''), 3000);
        // 重置表单
        setManualCreatedBy('');
        setManualEffectType('immediate');
      } else {
        setManualError(response.message || '更新失败');
      }
    } catch (err: any) {
      setManualError(err.message || '更新返点失败');
    } finally {
      setManualLoading(false);
    }
  };

  // ==================== 手动调整表单重置 ====================

  const handleManualReset = () => {
    setManualRebateRate(rebateData?.currentRebate?.rate?.toString() || '0');
    setManualEffectType('immediate');
    setManualCreatedBy('');
    setManualError('');
  };

  // ==================== 返回值 ====================

  return {
    // 数据状态
    rebateData,
    rebateHistory,
    rebateLoading,
    agencies,

    // UI 状态
    activeTab,
    setActiveTab,
    rebateMode,

    // 手动调整表单
    manualRebateRate,
    setManualRebateRate,
    manualEffectType,
    setManualEffectType,
    manualCreatedBy,
    setManualCreatedBy,
    manualLoading,
    handleManualSubmit,
    handleManualReset,

    // 机构同步
    syncLoading,
    handleSyncFromAgency,
    handleToggleMode,

    // 消息提示
    manualError,
    successMessage,

    // 分页
    currentPage,
    totalPages,
    totalRecords,
    handlePrevPage,
    handleNextPage,

    // 工具函数
    getAgencyName,
    loadRebateData,
  };
}
