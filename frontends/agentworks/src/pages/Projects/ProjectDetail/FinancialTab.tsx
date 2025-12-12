/**
 * 财务管理 Tab
 * 展示项目财务信息，支持批量设置日期和调整项管理
 * 支持根据客户配置动态渲染财务指标卡片
 *
 * @version 2.0.0
 * @changelog
 * - v2.0.0 (2025-12-11): 实现动态指标渲染，复用 EffectTab 设计系统
 * - v1.0.0: 初始版本，固定 6 个基础指标
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Tag,
  Space,
  DatePicker,
  Button,
  App,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Popconfirm,
  Upload,
  Card,
  Empty,
  Tooltip,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  ShoppingOutlined,
  WalletOutlined,
  BankOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  CalculatorOutlined,
  RiseOutlined,
  PercentageOutlined,
  FundOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileTextOutlined,
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CollaborationAdjustment,
  SettlementFile,
} from '../../../types/project';
import { formatMoney, centsToYuan, yuanToCents } from '../../../types/project';
import type { Platform } from '../../../types/talent';
import type {
  FinanceTabConfig,
  FinanceMetricKey,
} from '../../../types/projectConfig';
import {
  AVAILABLE_FINANCE_METRICS,
  DEFAULT_FINANCE_CONFIG,
} from '../../../types/projectConfig';
import { projectApi } from '../../../services/projectApi';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { designTokens } from '../../../config/antTheme';

// 财务专用样式（复用 EffectTab 设计系统）
const customStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .finance-tab-container {
    /* 使用全局设计系统变量 */
    --finance-income: var(--aw-metric-blue, #3b82f6);
    --finance-expense: var(--aw-danger-500, #ef4444);
    --finance-profit: var(--aw-success-500, #10b981);
    --finance-adjustment: var(--aw-metric-orange, #f97316);
    --finance-progress: var(--aw-metric-purple, #8b5cf6);
  }

  .finance-metrics-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
  }

  @media (max-width: 1280px) {
    .finance-metrics-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .finance-metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .finance-metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .finance-metric-card {
    position: relative;
    background: linear-gradient(135deg, var(--aw-white, #ffffff) 0%, var(--aw-gray-50, #f8fafc) 100%);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.02),
      0 4px 12px rgba(0, 0, 0, 0.04);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    animation: fadeInUp 0.5s ease-out backwards;
    min-height: 100px;
  }

  .finance-metric-card-inner {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 100%;
  }

  .finance-metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--accent-color, var(--aw-metric-blue, #3b82f6));
    border-radius: 16px 16px 0 0;
  }

  .finance-metric-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.04),
      0 12px 24px rgba(0, 0, 0, 0.08);
  }

  /* 颜色类型 */
  .finance-metric-card.income { --accent-color: var(--finance-income); }
  .finance-metric-card.expense { --accent-color: var(--finance-expense); }
  .finance-metric-card.profit { --accent-color: var(--finance-profit); }
  .finance-metric-card.adjustment { --accent-color: var(--finance-adjustment); }
  .finance-metric-card.progress { --accent-color: var(--finance-progress); }

  .finance-metric-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: var(--aw-white, white);
    flex-shrink: 0;
    background: var(--accent-color, var(--aw-metric-blue, #3b82f6));
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-color) 30%, transparent);
  }

  .finance-metric-value {
    font-size: 24px;
    font-weight: 700;
    font-feature-settings: 'tnum' on, 'lnum' on;
    letter-spacing: -0.02em;
    color: var(--aw-gray-900, #0f172a);
    line-height: 1.1;
  }

  .finance-metric-value.positive {
    color: var(--aw-success-500, #10b981);
  }

  .finance-metric-value.negative {
    color: var(--aw-danger-500, #ef4444);
  }

  .finance-metric-value.warning {
    color: var(--aw-warning-500, #f59e0b);
  }

  .finance-metric-label {
    font-size: 13px;
    color: var(--aw-gray-500, #64748b);
    font-weight: 500;
    margin-bottom: 4px;
  }

  .finance-metric-unit {
    font-size: 12px;
    color: var(--aw-gray-400, #94a3b8);
    font-weight: normal;
    margin-left: 4px;
  }

  .finance-data-table-wrapper {
    background: var(--aw-gray-50);
    border-radius: 16px;
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    animation: fadeInUp 0.6s ease-out 0.3s backwards;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar {
    padding: 16px 20px !important;
    border-bottom: 1px solid var(--aw-gray-100, #f1f5f9);
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-title {
    font-weight: 600;
    color: var(--aw-gray-900, #0f172a);
  }
`;

/**
 * 财务统计数据（扩展版）
 */
interface FinancialStats {
  totalAmount: number; // 执行总金额
  orderedAmount: number; // 已下单金额
  paidAmount: number; // 已打款金额
  recoveredAmount: number; // 已回款金额
  pendingCount: number; // 待下单数量
  adjustmentTotal: number; // 调整项合计
  // 高级指标（根据配置计算）
  totalExpense?: number; // 下单支出
  fundsOccupation?: number; // 资金占用费用
  expenseAdjustment?: number; // 支出调整
  incomeAdjustment?: number; // 收入调整
  operationalCost?: number; // 总运营成本
  grossProfit?: number; // 毛利润
  grossMargin?: number; // 毛利率
}

/**
 * 指标图标映射
 */
const METRIC_ICONS: Record<FinanceMetricKey, React.ReactNode> = {
  totalAmount: <DollarOutlined />,
  orderedAmount: <ShoppingOutlined />,
  paidAmount: <WalletOutlined />,
  recoveredAmount: <BankOutlined />,
  pendingCount: <ClockCircleOutlined />,
  adjustmentTotal: <SwapOutlined />,
  totalExpense: <CalculatorOutlined />,
  fundsOccupation: <FundOutlined />,
  expenseAdjustment: <SwapOutlined />,
  incomeAdjustment: <SwapOutlined />,
  operationalCost: <CalculatorOutlined />,
  grossProfit: <RiseOutlined />,
  grossMargin: <PercentageOutlined />,
};

interface FinancialTabProps {
  projectId: string;
  platforms: Platform[];
  /** 客户自定义财务配置 */
  financeConfig?: FinanceTabConfig;
  /** 项目结算文件列表（由父组件传入） */
  settlementFiles?: SettlementFile[];
  onRefresh?: () => void;
}

export function FinancialTab({
  projectId,
  platforms: _platforms,
  financeConfig,
  settlementFiles = [],
  onRefresh,
}: FinancialTabProps) {
  // platforms 参数保留用于后续平台筛选功能
  void _platforms;
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 使用配置或默认值
  const config = financeConfig || DEFAULT_FINANCE_CONFIG;
  const enabledMetrics =
    config.enabledMetrics || DEFAULT_FINANCE_CONFIG.enabledMetrics;

  // 调试：输出接收到的配置
  logger.debug('[FinancialTab] Received financeConfig:', financeConfig);
  logger.debug('[FinancialTab] Parsed enabledMetrics:', enabledMetrics);

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalAmount: 0,
    orderedAmount: 0,
    paidAmount: 0,
    recoveredAmount: 0,
    pendingCount: 0,
    adjustmentTotal: 0,
  });

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 批量操作弹窗
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchField, setBatchField] = useState<
    'orderDate' | 'paymentDate' | 'recoveryDate'
  >('orderDate');
  const [batchDate, setBatchDate] = useState<dayjs.Dayjs | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // 调整项弹窗
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [editingCollaborationId, setEditingCollaborationId] = useState<
    string | null
  >(null);
  const [adjustmentForm] = Form.useForm();

  // 文件上传状态
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFileUrl, setDeletingFileUrl] = useState<string | null>(null);

  /**
   * 计算统计数据（支持高级指标）
   */
  const calculateStats = useCallback(
    (data: Collaboration[]): FinancialStats => {
      let totalAmount = 0;
      let orderedAmount = 0;
      let paidAmount = 0;
      let recoveredAmount = 0;
      let pendingCount = 0;
      let adjustmentTotal = 0;
      let expenseAdjustment = 0;
      let incomeAdjustment = 0;

      data.forEach(c => {
        totalAmount += c.amount;

        if (c.orderDate) {
          orderedAmount += c.amount;
        } else {
          pendingCount++;
        }

        if (c.paymentDate) {
          paidAmount += c.amount;
        }

        if (c.recoveryDate) {
          recoveredAmount += c.amount;
        }

        // 计算调整项
        if (c.adjustments) {
          c.adjustments.forEach(adj => {
            adjustmentTotal += adj.amount;
            if (adj.amount < 0) {
              expenseAdjustment += adj.amount;
            } else {
              incomeAdjustment += adj.amount;
            }
          });
        }
      });

      // 基础统计
      const result: FinancialStats = {
        totalAmount,
        orderedAmount,
        paidAmount,
        recoveredAmount,
        pendingCount,
        adjustmentTotal,
      };

      // 高级指标计算（根据配置启用）
      if (enabledMetrics.includes('totalExpense')) {
        result.totalExpense = orderedAmount;
      }

      if (enabledMetrics.includes('expenseAdjustment')) {
        result.expenseAdjustment = expenseAdjustment;
      }

      if (enabledMetrics.includes('incomeAdjustment')) {
        result.incomeAdjustment = incomeAdjustment;
      }

      if (enabledMetrics.includes('operationalCost')) {
        result.operationalCost = orderedAmount + Math.abs(expenseAdjustment);
      }

      if (enabledMetrics.includes('grossProfit')) {
        result.grossProfit = totalAmount - orderedAmount + adjustmentTotal;
      }

      if (enabledMetrics.includes('grossMargin')) {
        const profit = totalAmount - orderedAmount + adjustmentTotal;
        result.grossMargin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;
      }

      // 资金占用费用计算（如果启用）
      if (
        enabledMetrics.includes('fundsOccupation') &&
        config.enableFundsOccupation
      ) {
        const rate = config.fundsOccupationRate ?? 0.7; // 默认月费率 0.7%
        let fundsOccupation = 0;

        data.forEach(c => {
          if (c.orderDate) {
            const orderDate = dayjs(c.orderDate);
            const endDate = c.recoveryDate ? dayjs(c.recoveryDate) : dayjs();
            const days = endDate.diff(orderDate, 'day');
            // 费用 = 支出 × (月费率% / 30) × 占用天数
            fundsOccupation += c.amount * (rate / 100 / 30) * days;
          }
        });

        result.fundsOccupation = Math.round(fundsOccupation);
      }

      return result;
    },
    [enabledMetrics, config.enableFundsOccupation, config.fundsOccupationRate]
  );

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500,
      });

      if (response.success) {
        setCollaborations(response.data.items);
        setStats(calculateStats(response.data.items));
      } else {
        setCollaborations([]);
        message.error('获取财务数据失败');
      }
    } catch (error) {
      logger.error('Error loading financial data:', error);
      message.error('获取财务数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, message, calculateStats]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 快速更新日期
   */
  const handleUpdateDate = async (
    id: string,
    field: 'orderDate' | 'paymentDate' | 'recoveryDate',
    value: string | null
  ) => {
    try {
      const response = await projectApi.updateCollaboration(id, {
        [field]: value,
      });
      if (response.success) {
        message.success('更新成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch {
      message.error('更新失败');
    }
  };

  /**
   * 批量更新日期
   */
  const handleBatchUpdate = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return;
    }

    if (!batchDate) {
      message.warning('请选择日期');
      return;
    }

    try {
      setBatchLoading(true);
      const response = await projectApi.batchUpdateCollaborations({
        ids: selectedRowKeys,
        updates: {
          [batchField]: batchDate.format('YYYY-MM-DD'),
        },
      });

      if (response.success) {
        message.success(`批量更新成功，共 ${selectedRowKeys.length} 条`);
        setBatchModalOpen(false);
        setBatchDate(null);
        setSelectedRowKeys([]);
        loadCollaborations();
        onRefresh?.();
      }
    } catch {
      message.error('批量更新失败');
    } finally {
      setBatchLoading(false);
    }
  };

  /**
   * 打开添加调整项弹窗
   */
  const handleOpenAdjustmentModal = (collaborationId: string) => {
    setEditingCollaborationId(collaborationId);
    adjustmentForm.resetFields();
    setAdjustmentModalOpen(true);
  };

  /**
   * 添加调整项
   */
  const handleAddAdjustment = async () => {
    if (!editingCollaborationId) return;

    try {
      const values = await adjustmentForm.validateFields();
      const collaboration = collaborations.find(
        c => c.id === editingCollaborationId
      );
      if (!collaboration) return;

      const newAdjustment: CollaborationAdjustment = {
        id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: values.type,
        amount: yuanToCents(values.amount) * (values.isNegative ? -1 : 1),
        reason: values.reason,
      };

      const updatedAdjustments = [
        ...(collaboration.adjustments || []),
        newAdjustment,
      ];

      const response = await projectApi.updateCollaboration(
        editingCollaborationId,
        {
          adjustments: updatedAdjustments,
        }
      );

      if (response.success) {
        message.success('添加调整项成功');
        setAdjustmentModalOpen(false);
        loadCollaborations();
        onRefresh?.();
      }
    } catch {
      message.error('添加调整项失败');
    }
  };

  /**
   * 删除调整项
   */
  const handleDeleteAdjustment = async (
    collaborationId: string,
    adjustmentId: string
  ) => {
    try {
      const collaboration = collaborations.find(c => c.id === collaborationId);
      if (!collaboration) return;

      const updatedAdjustments = (collaboration.adjustments || []).filter(
        adj => adj.id !== adjustmentId
      );

      const response = await projectApi.updateCollaboration(collaborationId, {
        adjustments: updatedAdjustments,
      });

      if (response.success) {
        message.success('删除调整项成功');
        loadCollaborations();
        onRefresh?.();
      }
    } catch {
      message.error('删除调整项失败');
    }
  };

  /**
   * 批量操作字段选项
   */
  const batchFieldOptions = [
    { label: '下单日期', value: 'orderDate' },
    { label: '打款日期', value: 'paymentDate' },
    { label: '回款日期', value: 'recoveryDate' },
  ];

  // =========================================================================
  // 结算文件管理
  // =========================================================================

  /**
   * 根据文件类型获取对应图标
   */
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return (
          <FilePdfOutlined
            style={{ fontSize: 24, color: designTokens.danger[500] }}
          />
        );
      case 'xls':
      case 'xlsx':
        return (
          <FileExcelOutlined
            style={{ fontSize: 24, color: designTokens.success[500] }}
          />
        );
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return (
          <FileImageOutlined
            style={{ fontSize: 24, color: designTokens.info[500] }}
          />
        );
      case 'doc':
      case 'docx':
      case 'txt':
        return (
          <FileTextOutlined
            style={{ fontSize: 24, color: designTokens.primary[500] }}
          />
        );
      default:
        return (
          <FileOutlined
            style={{ fontSize: 24, color: designTokens.gray[400] }}
          />
        );
    }
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * 上传结算文件
   */
  const handleUploadFile: UploadProps['customRequest'] = async options => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;

    try {
      setUploadingFile(true);

      // 1. 上传文件到 TOS
      const uploadResponse = await projectApi.uploadFile(uploadFile);
      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error(uploadResponse.message || '文件上传失败');
      }

      // 2. 构建新的文件对象
      const newFile: SettlementFile = {
        name: uploadFile.name,
        url: uploadResponse.data.url,
        uploadedAt: new Date().toISOString(),
        size: uploadFile.size,
        type: uploadFile.type,
      };

      // 3. 更新项目的 settlementFiles
      const updatedFiles = [...settlementFiles, newFile];
      await projectApi.updateSettlementFiles(projectId, updatedFiles);

      message.success('文件上传成功');
      onSuccess?.(uploadResponse.data);
      onRefresh?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '文件上传失败';
      message.error(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setUploadingFile(false);
    }
  };

  /**
   * 删除结算文件
   */
  const handleDeleteFile = async (fileUrl: string) => {
    try {
      setDeletingFileUrl(fileUrl);

      // 调用删除接口（会同时删除 TOS 文件和数据库引用）
      await projectApi.deleteFile(projectId, fileUrl, 'settlementFiles');

      message.success('文件删除成功');
      onRefresh?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '文件删除失败';
      message.error(errorMessage);
    } finally {
      setDeletingFileUrl(null);
    }
  };

  /**
   * 预览文件
   */
  const handlePreviewFile = (file: SettlementFile) => {
    // 对于 PDF 文件，使用预览接口
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      // 从 URL 提取 fileKey
      const url = new URL(file.url);
      const fileKey = url.pathname.substring(1);
      const previewUrl = projectApi.getFilePreviewUrl(fileKey);
      window.open(previewUrl, '_blank');
    } else {
      // 其他文件直接打开原始链接
      window.open(file.url, '_blank');
    }
  };

  /**
   * 下载文件
   */
  const handleDownloadFile = (file: SettlementFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 获取指标值
   */
  const getMetricValue = (key: FinanceMetricKey): number => {
    switch (key) {
      case 'totalAmount':
        return stats.totalAmount;
      case 'orderedAmount':
        return stats.orderedAmount;
      case 'paidAmount':
        return stats.paidAmount;
      case 'recoveredAmount':
        return stats.recoveredAmount;
      case 'pendingCount':
        return stats.pendingCount;
      case 'adjustmentTotal':
        return stats.adjustmentTotal;
      case 'totalExpense':
        return stats.totalExpense ?? 0;
      case 'fundsOccupation':
        return stats.fundsOccupation ?? 0;
      case 'expenseAdjustment':
        return stats.expenseAdjustment ?? 0;
      case 'incomeAdjustment':
        return stats.incomeAdjustment ?? 0;
      case 'operationalCost':
        return stats.operationalCost ?? 0;
      case 'grossProfit':
        return stats.grossProfit ?? 0;
      case 'grossMargin':
        return stats.grossMargin ?? 0;
      default:
        return 0;
    }
  };

  /**
   * 格式化指标显示值
   */
  const formatMetricValue = (
    key: FinanceMetricKey,
    value: number
  ): { display: string; className: string } => {
    // 待下单数量特殊处理
    if (key === 'pendingCount') {
      return {
        display: `${value}`,
        className: value > 0 ? 'warning' : '',
      };
    }

    // 毛利率特殊处理
    if (key === 'grossMargin') {
      return {
        display: `${value.toFixed(1)}%`,
        className: value >= 0 ? 'positive' : 'negative',
      };
    }

    // 调整类指标（可正可负）
    if (
      key === 'adjustmentTotal' ||
      key === 'expenseAdjustment' ||
      key === 'incomeAdjustment'
    ) {
      const prefix = value >= 0 ? '+' : '';
      return {
        display: `${prefix}${centsToYuan(value).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
        className: value >= 0 ? 'positive' : 'negative',
      };
    }

    // 毛利润
    if (key === 'grossProfit') {
      return {
        display: centsToYuan(value).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
        }),
        className: value >= 0 ? 'positive' : 'negative',
      };
    }

    // 默认金额格式
    return {
      display: centsToYuan(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
      }),
      className: '',
    };
  };

  /**
   * 获取指标颜色类型
   */
  const getMetricColorType = (key: FinanceMetricKey): string => {
    const metricConfig = AVAILABLE_FINANCE_METRICS.find(m => m.key === key);
    return metricConfig?.colorType || 'income';
  };

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人昵称',
      dataIndex: 'talentName',
      width: 200,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => (
        <TalentNameWithLinks {...fromCollaboration(record)} />
      ),
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 90,
      render: (_, record) => (
        <Tag color={platformColors[record.talentPlatform] || 'default'}>
          {platformNames[record.talentPlatform] || record.talentPlatform}
        </Tag>
      ),
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 110,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '返点率',
      dataIndex: 'rebateRate',
      width: 80,
      render: (_, record) =>
        record.rebateRate ? `${record.rebateRate}%` : '-',
    },
    {
      title: '下单日期',
      dataIndex: 'orderDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.orderDate ? dayjs(record.orderDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'orderDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '打款日期',
      dataIndex: 'paymentDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.paymentDate ? dayjs(record.paymentDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'paymentDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '回款日期',
      dataIndex: 'recoveryDate',
      width: 140,
      render: (_, record) => (
        <DatePicker
          value={record.recoveryDate ? dayjs(record.recoveryDate) : null}
          onChange={date =>
            handleUpdateDate(
              record.id,
              'recoveryDate',
              date ? date.format('YYYY-MM-DD') : null
            )
          }
          placeholder="选择日期"
          size="small"
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: '调整项',
      dataIndex: 'adjustments',
      width: 200,
      render: (_, record) => {
        const adjustments = record.adjustments || [];
        const total = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

        return (
          <Space direction="vertical" size="small" className="w-full">
            {adjustments.length > 0 ? (
              <>
                {adjustments.map(adj => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>
                      {adj.type}:{' '}
                      <span
                        className={
                          adj.amount >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-500'
                        }
                      >
                        {adj.amount >= 0 ? '+' : ''}
                        {formatMoney(adj.amount)}
                      </span>
                    </span>
                    <Popconfirm
                      title="确定删除该调整项？"
                      onConfirm={() =>
                        handleDeleteAdjustment(record.id, adj.id)
                      }
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="p-0"
                      />
                    </Popconfirm>
                  </div>
                ))}
                <div className="text-xs border-t pt-1">
                  合计:{' '}
                  <span
                    className={`font-medium ${total >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-500'}`}
                  >
                    {total >= 0 ? '+' : ''}
                    {formatMoney(total)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-content-muted">-</span>
            )}
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenAdjustmentModal(record.id)}
              className="p-0"
            >
              添加
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <style>{customStyles}</style>
      <div className="finance-tab-container space-y-6">
        {/* 财务统计看板 - CSS Grid 布局确保等高 */}
        <div className="finance-metrics-grid">
          {enabledMetrics.map((metricKey, index) => {
            const metricConfig = AVAILABLE_FINANCE_METRICS.find(
              m => m.key === metricKey
            );
            if (!metricConfig) return null;

            const value = getMetricValue(metricKey);
            const { display, className } = formatMetricValue(metricKey, value);
            const colorType = getMetricColorType(metricKey);

            return (
              <div
                key={metricKey}
                className={`finance-metric-card ${colorType}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="finance-metric-card-inner">
                  <div className="finance-metric-icon">
                    {METRIC_ICONS[metricKey]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="finance-metric-label">
                      {metricConfig.label}
                    </div>
                    <div className={`finance-metric-value ${className}`}>
                      {display}
                      <span className="finance-metric-unit">
                        {metricConfig.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 结算文件管理区域（根据配置显示） */}
        {config.enableSettlementFiles && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <FileOutlined />
                结算文件管理
              </span>
            }
            extra={
              <Upload
                customRequest={handleUploadFile}
                showUploadList={false}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              >
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={uploadingFile}
                >
                  上传文件
                </Button>
              </Upload>
            }
            className="shadow-card"
          >
            {settlementFiles.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无结算文件"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {settlementFiles.map((file, index) => (
                  <div
                    key={`${file.url}-${index}`}
                    className="group relative p-4 bg-surface-base rounded-lg border border-stroke hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-2 bg-surface rounded-lg shadow-sm">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Tooltip title={file.name}>
                          <div className="font-medium text-content truncate text-sm">
                            {file.name}
                          </div>
                        </Tooltip>
                        <div className="text-xs text-content-muted mt-1">
                          {formatFileSize(file.size)}
                          {file.uploadedAt && (
                            <span className="ml-2">
                              {dayjs(file.uploadedAt).format('MM-DD HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Space size="small">
                        <Tooltip title="预览">
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewFile(file)}
                          />
                        </Tooltip>
                        <Tooltip title="下载">
                          <Button
                            type="text"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadFile(file)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定删除此文件？"
                          description="删除后无法恢复"
                          onConfirm={() => handleDeleteFile(file.url)}
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                        >
                          <Tooltip title="删除">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deletingFileUrl === file.url}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 财务列表 */}
        <div className="finance-data-table-wrapper">
          <ProTable<Collaboration>
            columns={columns}
            actionRef={actionRef}
            cardBordered={false}
            dataSource={collaborations}
            loading={loading}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: keys => setSelectedRowKeys(keys as string[]),
            }}
            tableAlertRender={({ selectedRowKeys }) => (
              <Space>
                <span>已选择 {selectedRowKeys.length} 条</span>
              </Space>
            )}
            tableAlertOptionRender={() => (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckSquareOutlined />}
                  onClick={() => setBatchModalOpen(true)}
                >
                  批量设置日期
                </Button>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
              </Space>
            )}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: t => `共 ${t} 条`,
            }}
            search={false}
            dateFormatter="string"
            headerTitle="财务明细"
            toolBarRender={() => [
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={() => loadCollaborations()}
              >
                刷新
              </Button>,
            ]}
            scroll={{ x: 1100 }}
            options={{
              fullScreen: true,
              density: true,
              setting: true,
            }}
          />
        </div>

        {/* 批量设置日期弹窗 */}
        <Modal
          title="批量设置日期"
          open={batchModalOpen}
          onOk={handleBatchUpdate}
          onCancel={() => {
            setBatchModalOpen(false);
            setBatchDate(null);
          }}
          confirmLoading={batchLoading}
        >
          <div className="space-y-4 py-4">
            <div>
              <div className="mb-2 text-content-secondary">设置字段</div>
              <Select
                value={batchField}
                onChange={setBatchField}
                options={batchFieldOptions}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div className="mb-2 text-content-secondary">日期</div>
              <DatePicker
                value={batchDate}
                onChange={setBatchDate}
                style={{ width: '100%' }}
                placeholder="选择日期"
              />
            </div>
            <div className="text-content-muted text-sm">
              将为选中的 {selectedRowKeys.length} 条记录设置{' '}
              {batchFieldOptions.find(o => o.value === batchField)?.label}
            </div>
          </div>
        </Modal>

        {/* 添加调整项弹窗 */}
        <Modal
          title="添加调整项"
          open={adjustmentModalOpen}
          onOk={handleAddAdjustment}
          onCancel={() => setAdjustmentModalOpen(false)}
          destroyOnClose
        >
          <Form form={adjustmentForm} layout="vertical" className="mt-4">
            <Form.Item
              name="type"
              label="调整类型"
              rules={[{ required: true, message: '请选择调整类型' }]}
              initialValue="价格调整"
            >
              <Select
                options={[
                  { label: '价格调整', value: '价格调整' },
                  { label: '其他', value: '其他' },
                ]}
              />
            </Form.Item>
            <div className="flex gap-4">
              <Form.Item
                name="amount"
                label="金额（元）"
                rules={[
                  { required: true, message: '请输入金额' },
                  { type: 'number', min: 0, message: '金额不能为负数' },
                ]}
                className="flex-1"
              >
                <InputNumber
                  placeholder="输入金额"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
              <Form.Item
                name="isNegative"
                label="方向"
                initialValue={false}
                className="w-32"
              >
                <Select
                  options={[
                    { label: '增加 (+)', value: false },
                    { label: '减少 (-)', value: true },
                  ]}
                />
              </Form.Item>
            </div>
            <Form.Item name="reason" label="原因说明">
              <Input.TextArea placeholder="可选" rows={2} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}

export default FinancialTab;
