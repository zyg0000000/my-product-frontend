/**
 * 财务管理 Tab
 * 展示项目财务信息，支持批量设置日期和调整项管理
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
  Tabs,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  FundOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileTextOutlined,
  UploadOutlined,
  EyeOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CollaborationAdjustment,
  SettlementFile,
  Project,
  OrderMode,
} from '../../../types/project';
import {
  formatMoney,
  centsToYuan,
  yuanToCents,
  normalizeBusinessTypes,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import type { BusinessTypeKey } from '../../../types/customer';
import { BUSINESS_TYPES, BUSINESS_TYPE_OPTIONS } from '../../../types/customer';
import type { FinanceTabConfig } from '../../../types/projectConfig';
import {
  DEFAULT_FINANCE_CONFIG,
  DEFAULT_ADJUSTMENT_TYPES,
} from '../../../types/projectConfig';
import { projectApi } from '../../../services/projectApi';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { designTokens } from '../../../config/antTheme';
import {
  calculateProjectFinanceStats,
  createFinanceContextFromProject,
  batchCalculateFinance,
  calculateSingleFundsOccupation,
  isValidForFinance,
  ORDER_MODE_OPTIONS,
  type FinanceCalculationContext,
  type ProjectFinanceStats,
} from '../../../utils/financeCalculator';

// 财务专用样式 - 统一视觉系统
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
    /* 容器基础样式 */
  }

  /* 统一区块样式 - 所有卡片使用相同视觉规范 */
  .finance-section {
    background: var(--color-bg-elevated);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    overflow: hidden;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .finance-section:hover {
    border-color: var(--aw-primary-200);
  }

  .finance-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    min-height: 60px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-elevated);
  }

  .finance-section__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .finance-section__title-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--aw-primary-50);
    color: var(--aw-primary-600);
    font-size: 14px;
  }

  .finance-section__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .finance-section__body {
    padding: 16px 20px;
  }

  .finance-section__body--compact {
    padding: 12px 16px;
  }

  /* 表格区块 */
  .finance-data-table-wrapper {
    background: var(--color-bg-elevated);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  .finance-data-table-wrapper:hover {
    border-color: var(--aw-primary-200);
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar {
    padding: 0 !important;
    border-bottom: 1px solid var(--color-border);
    min-height: 60px;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-container {
    padding: 12px 20px !important;
    margin: 0 !important;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    padding: 0 !important;
    margin: 0 !important;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-left {
    padding: 0 !important;
    margin: 0 !important;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-right {
    padding: 0 !important;
    margin: 0 !important;
  }

  .finance-data-table-wrapper .ant-pro-table-list-toolbar-setting-items {
    margin-right: 0 !important;
  }

  /* 确保标题图标和文字对齐 */
  .finance-data-table-wrapper .ant-pro-table-list-toolbar-title > span {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* finance-section 内 ProTable 表格间距 - 与 body padding 保持一致 */
  .finance-section .ant-pro-table {
    padding: 16px 20px;
  }

  .finance-section .ant-pro-table .ant-pro-card-body {
    padding: 0 !important;
  }

  /* 文件网格布局 */
  .finance-files-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .finance-file-card {
    position: relative;
    padding: 12px;
    background: var(--color-bg-sunken);
    border-radius: 8px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .finance-file-card:hover {
    background: var(--color-bg-elevated);
    border-color: var(--aw-primary-200);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .finance-file-card__actions {
    position: absolute;
    top: 6px;
    right: 6px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .finance-file-card:hover .finance-file-card__actions {
    opacity: 1;
  }

  /* 空状态 */
  .finance-empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--color-text-muted);
  }

  .finance-empty-state__icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.5;
  }
`;

interface FinancialTabProps {
  projectId: string;
  platforms: Platform[];
  /** 项目数据（用于获取定价模式、折扣率等快照） */
  project?: Project;
  /** 客户自定义财务配置 */
  financeConfig?: FinanceTabConfig;
  /** 项目结算文件列表（由父组件传入） */
  settlementFiles?: SettlementFile[];
  onRefresh?: () => void;
}

export function FinancialTab({
  projectId,
  platforms: _platforms,
  project,
  financeConfig,
  settlementFiles = [],
  onRefresh,
}: FinancialTabProps) {
  // platforms 参数保留用于后续平台筛选功能
  void _platforms;
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // v5.2: 根据项目业务类型动态生成 Tab
  const projectBusinessTypes = useMemo(() => {
    return normalizeBusinessTypes(project?.businessType);
  }, [project?.businessType]);

  // v5.2: 业务类型 Tab 状态，默认选中项目第一个业务类型
  const [activeBusinessTab, setActiveBusinessTab] = useState<
    BusinessTypeKey | 'all' | null
  >(null);

  // 当项目业务类型加载后，更新默认激活的 Tab
  useEffect(() => {
    if (projectBusinessTypes.length > 0) {
      // 如果当前选中的 Tab 为空或不在项目业务类型中，切换到第一个
      if (
        activeBusinessTab === null ||
        (activeBusinessTab !== 'all' &&
          !projectBusinessTypes.includes(activeBusinessTab))
      ) {
        setActiveBusinessTab(projectBusinessTypes[0]);
      }
    }
  }, [projectBusinessTypes, activeBusinessTab]);

  // 生成动态 Tab 列表
  const businessTabItems = useMemo(() => {
    const items = projectBusinessTypes
      .map(type => {
        const option = BUSINESS_TYPE_OPTIONS.find(opt => opt.value === type);
        return option ? { key: option.value as string, label: option.label } : null;
      })
      .filter((item): item is { key: string; label: string } => item !== null);

    // 如果有多个业务类型，添加"全部"Tab
    if (items.length > 1) {
      items.push({ key: 'all', label: '全部' });
    }

    return items;
  }, [projectBusinessTypes]);

  // 使用配置或默认值
  const config = financeConfig || DEFAULT_FINANCE_CONFIG;

  // 平台配置
  const {
    configs: platformConfigs,
    getPlatformNames,
    getPlatformColors,
  } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // v5.2: 创建财务计算上下文
  const financeContext = useMemo<FinanceCalculationContext | null>(() => {
    if (!project || platformConfigs.length === 0) return null;
    return createFinanceContextFromProject(project, platformConfigs);
  }, [project, platformConfigs]);

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [rawCollaborations, setRawCollaborations] = useState<Collaboration[]>(
    []
  ); // 原始数据
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]); // 计算后的数据

  // 财务明细只显示参与计算的记录（客户已定档、视频已发布）
  const financeCollaborations = useMemo(() => {
    return collaborations.filter(isValidForFinance);
  }, [collaborations]);

  // v5.2: 计算项目级财务统计（使用已过滤的数据，无需再次筛选）
  const projectFinanceStats = useMemo<ProjectFinanceStats | null>(() => {
    if (!financeContext || financeCollaborations.length === 0) return null;
    return calculateProjectFinanceStats(
      financeCollaborations,
      financeContext,
      config.enableFundsOccupation
        ? {
            enabled: true,
            monthlyRate: config.fundsOccupationRate ?? 0.7,
          }
        : undefined,
      false // 数据已过滤，不再重复筛选
    );
  }, [
    financeContext,
    financeCollaborations,
    config.enableFundsOccupation,
    config.fundsOccupationRate,
  ]);

  // 选择状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // 批量操作弹窗
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchField, setBatchField] = useState<'orderDate' | 'recoveryDate'>(
    'orderDate'
  );
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
   * 加载合作记录（只获取原始数据）
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
        setRawCollaborations(response.data.items);
      } else {
        setRawCollaborations([]);
        message.error('获取财务数据失败');
      }
    } catch (error) {
      logger.error('Error loading financial data:', error);
      message.error('获取财务数据失败');
      setRawCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  // 初次加载
  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  // v5.2: 当原始数据或财务上下文变化时，重新计算财务字段
  useEffect(() => {
    // 调试：输出计算上下文状态
    logger.info('[FinancialTab] 财务计算触发', {
      hasProject: !!project,
      projectId: project?.id,
      hasFinanceContext: !!financeContext,
      rawCollaborationsCount: rawCollaborations.length,
      projectDiscounts: project?.platformDiscounts,
      projectCoefficients: project?.platformQuotationCoefficients,
      platformConfigsCount: platformConfigs.length,
    });

    if (rawCollaborations.length === 0) {
      setCollaborations([]);
      return;
    }

    // 如果有财务计算上下文，计算财务数据
    let items = rawCollaborations;
    if (financeContext) {
      items = batchCalculateFinance(rawCollaborations, financeContext);
      logger.debug('[FinancialTab] 已计算财务数据', {
        count: items.length,
        sample: items[0]?.finance,
      });
    }

    setCollaborations(items);
  }, [rawCollaborations, financeContext, project, platformConfigs]);

  /**
   * 快速更新日期
   */
  const handleUpdateDate = async (
    id: string,
    field: 'orderDate' | 'recoveryDate',
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

  // ==================== 表格列定义（简化版，详情在展开行） ====================
  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人昵称',
      dataIndex: 'talentName',
      width: 160,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => (
        <TalentNameWithLinks {...fromCollaboration(record)} />
      ),
    },
    {
      title: '下单方式',
      dataIndex: 'orderMode',
      width: 110,
      render: (_, record) => {
        const mode = record.orderMode || 'adjusted';
        return (
          <Select
            value={mode}
            onChange={async (value: OrderMode) => {
              try {
                await projectApi.updateCollaboration(record.id, {
                  orderMode: value,
                });
                message.success('更新成功');
                loadCollaborations();
              } catch {
                message.error('更新失败');
              }
            }}
            options={ORDER_MODE_OPTIONS}
            size="small"
            style={{ width: 95 }}
          />
        );
      },
    },
    {
      title: '收入',
      dataIndex: ['finance', 'revenue'],
      width: 120,
      render: (_, record) => {
        const revenue = record.finance?.revenue;
        if (revenue === undefined) return '-';
        return (
          <span className="font-semibold text-primary-600">
            {formatMoney(revenue)}
          </span>
        );
      },
    },
    {
      title: '成本',
      dataIndex: ['finance', 'cost'],
      width: 120,
      render: (_, record) => {
        const cost = record.finance?.cost;
        if (cost === undefined) return '-';
        return <span className="font-semibold">{formatMoney(cost)}</span>;
      },
    },
    {
      title: (
        <Tooltip title="基础利润 = 收入 - 成本 + 返点收入">基础利润</Tooltip>
      ),
      dataIndex: ['finance', 'profit'],
      width: 140,
      render: (_, record) => {
        const profit = record.finance?.profit;
        const revenue = record.finance?.revenue;
        if (profit === undefined) return '-';
        const profitRate = revenue ? (profit / revenue) * 100 : 0;
        return (
          <div>
            <span className="font-semibold">{formatMoney(profit)}</span>
            <span
              className={`ml-1 text-xs ${profitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
            >
              {profitRate.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="净利润 = 基础利润 + 调整项 - 资金占用费">
          净利润
        </Tooltip>
      ),
      dataIndex: 'netProfit',
      width: 140,
      render: (_, record) => {
        const profit = record.finance?.profit;
        const revenue = record.finance?.revenue;
        if (profit === undefined) return '-';
        const adjustmentsTotal = (record.adjustments || []).reduce(
          (sum, adj) => sum + adj.amount,
          0
        );
        // 如果启用了资金占用费，计算资金占用费
        let fundsOccupationFee = 0;
        if (
          config.enableFundsOccupation &&
          record.orderDate &&
          record.recoveryDate
        ) {
          const fundsResult = calculateSingleFundsOccupation(
            record,
            config.fundsOccupationRate ?? 0.7
          );
          if (fundsResult) {
            fundsOccupationFee = fundsResult.fee;
          }
        }
        const netProfit = profit + adjustmentsTotal - fundsOccupationFee;
        const netProfitRate = revenue ? (netProfit / revenue) * 100 : 0;
        return (
          <div>
            <span
              className={
                netProfit >= 0
                  ? 'text-success-600 font-semibold'
                  : 'text-danger-500 font-semibold'
              }
            >
              {formatMoney(netProfit)}
            </span>
            <span
              className={`ml-1 text-xs ${netProfitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
            >
              {netProfitRate.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'operation',
      width: 130,
      fixed: 'right',
      render: (_, record) => {
        const adjustments = record.adjustments || [];
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleOpenAdjustmentModal(record.id)}
            >
              调整
            </Button>
            {adjustments.length > 0 && (
              <Popconfirm
                title={
                  <div className="space-y-2">
                    <div className="font-medium">调整项明细：</div>
                    {adjustments.map(adj => (
                      <div
                        key={adj.id}
                        className="flex justify-between items-center gap-4"
                      >
                        <span>
                          {adj.type}: {adj.amount >= 0 ? '+' : ''}
                          {formatMoney(adj.amount)}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteAdjustment(record.id, adj.id);
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    ))}
                  </div>
                }
                showCancel={false}
                okText="关闭"
              >
                <Button type="link" size="small">
                  明细({adjustments.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  // ==================== 展开行渲染（详细财务信息） ====================
  const expandedRowRender = (record: Collaboration) => {
    const adjustments = record.adjustments || [];
    const adjustmentsTotal = adjustments.reduce(
      (sum, adj) => sum + adj.amount,
      0
    );
    const fundsResult = config.enableFundsOccupation
      ? calculateSingleFundsOccupation(
          record,
          config.fundsOccupationRate ?? 0.7
        )
      : null;

    return (
      <div className="bg-surface-base rounded-lg px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {/* 价格信息 */}
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">刊例价</span>
            <span className="font-medium">{formatMoney(record.amount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">返点率</span>
            <span className="font-medium">
              {record.rebateRate ? `${record.rebateRate}%` : '-'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">返点收入</span>
            <span
              className={`font-medium ${(record.finance?.rebateIncome ?? 0) > 0 ? 'text-success-600' : ''}`}
            >
              {record.finance?.rebateIncome !== undefined
                ? formatMoney(record.finance.rebateIncome)
                : '-'}
            </span>
          </div>

          {/* 调整项 */}
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">调整项</span>
            {adjustments.length > 0 ? (
              <Tooltip
                title={
                  <div className="space-y-1">
                    {adjustments.map(adj => (
                      <div key={adj.id}>
                        {adj.type}: {adj.amount >= 0 ? '+' : ''}
                        {formatMoney(adj.amount)}
                        {adj.reason && (
                          <span className="text-gray-400 ml-1">
                            ({adj.reason})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                }
              >
                <span
                  className={`font-medium cursor-help ${adjustmentsTotal >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                >
                  {adjustmentsTotal >= 0 ? '+' : ''}
                  {formatMoney(adjustmentsTotal)}
                </span>
              </Tooltip>
            ) : (
              <span className="text-content-muted">-</span>
            )}
          </div>

          {/* 分隔符 */}
          <div className="w-px h-4 bg-stroke" />

          {/* 日期选择 */}
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">下单日期</span>
            <DatePicker
              value={record.orderDate ? dayjs(record.orderDate) : null}
              onChange={date =>
                handleUpdateDate(
                  record.id,
                  'orderDate',
                  date ? date.format('YYYY-MM-DD') : null
                )
              }
              placeholder="选择"
              size="small"
              style={{ width: 120 }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-content-muted">回款日期</span>
            <DatePicker
              value={record.recoveryDate ? dayjs(record.recoveryDate) : null}
              onChange={date =>
                handleUpdateDate(
                  record.id,
                  'recoveryDate',
                  date ? date.format('YYYY-MM-DD') : null
                )
              }
              placeholder="选择"
              size="small"
              style={{ width: 120 }}
            />
          </div>

          {/* 资金占用费（仅当启用时显示） */}
          {config.enableFundsOccupation && (
            <div className="flex items-center gap-1.5">
              <Tooltip
                title={`月费率 ${config.fundsOccupationRate ?? 0.7}%，按日计算`}
              >
                <span className="text-content-muted cursor-help">
                  资金占用费
                </span>
              </Tooltip>
              {fundsResult ? (
                <Tooltip title={`占用 ${fundsResult.days} 天`}>
                  <span className="font-medium text-warning-600 cursor-help">
                    {formatMoney(fundsResult.fee)}
                  </span>
                </Tooltip>
              ) : (
                <span className="text-content-muted">-</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="finance-tab-container space-y-6">
        {/* v5.2: 业务类型 Tabs - 根据项目业务类型动态显示，仅多个业务类型时显示 */}
        {businessTabItems.length > 1 && activeBusinessTab && (
          <Tabs
            activeKey={activeBusinessTab}
            onChange={key =>
              setActiveBusinessTab(key as BusinessTypeKey | 'all')
            }
            items={businessTabItems}
            className="mb-4"
          />
        )}

        {/* 达人采买业务内容 */}
        {activeBusinessTab === 'talentProcurement' && (
          <>
            {/* 平台财务概览（配置 + 统计融合） */}
            <div className="finance-section">
              <div className="finance-section__header">
                <h3 className="finance-section__title">
                  <span className="finance-section__title-icon">
                    <FundOutlined />
                  </span>
                  平台财务概览
                  {!project?.platformPricingModes &&
                    !project?.platformDiscounts && (
                      <Tag color="warning" style={{ marginLeft: 8 }}>
                        <InfoCircleOutlined style={{ marginRight: 4 }} />
                        未配置定价策略
                      </Tag>
                    )}
                </h3>
              </div>
              <div className="finance-section__body">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {project?.platforms?.map(platform => {
                    const pricingMode =
                      project.platformPricingModes?.[platform];
                    const discount = project.platformDiscounts?.[platform];
                    const coefficient =
                      project.platformQuotationCoefficients?.[platform];
                    const platformConfig = platformConfigs.find(
                      c => c.platform === platform
                    );
                    const orderPriceRatio =
                      platformConfig?.business?.orderPriceRatio;
                    const platformStat =
                      projectFinanceStats?.platformStats.find(
                        s => s.platform === platform
                      );

                    return (
                      <div
                        key={platform}
                        className="p-4 bg-surface-base rounded-lg border border-stroke hover:border-primary-200 transition-colors"
                      >
                        {/* 平台标题 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Tag color={platformColors[platform] || 'default'}>
                              {platformNames[platform] || platform}
                            </Tag>
                            <Tag
                              color={
                                pricingMode === 'framework'
                                  ? 'blue'
                                  : pricingMode === 'project'
                                    ? 'green'
                                    : pricingMode === 'hybrid'
                                      ? 'purple'
                                      : 'default'
                              }
                            >
                              {pricingMode === 'framework'
                                ? '框架'
                                : pricingMode === 'project'
                                  ? '比价'
                                  : pricingMode === 'hybrid'
                                    ? '混合'
                                    : '未设置'}
                            </Tag>
                          </div>
                          {platformStat && (
                            <span className="text-xs text-content-muted">
                              {platformStat.count} 条记录
                            </span>
                          )}
                        </div>

                        {/* 配置信息 */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted mb-3 pb-3 border-b border-stroke">
                          {(pricingMode === 'framework' ||
                            pricingMode === 'hybrid') && (
                            <>
                              <span>
                                报价系数{' '}
                                <span className="text-content font-medium">
                                  {coefficient
                                    ? `${(coefficient * 100).toFixed(2)}%`
                                    : '-'}
                                </span>
                              </span>
                              <span>
                                折扣率{' '}
                                <span className="text-content font-medium">
                                  {discount
                                    ? `${(discount * 100).toFixed(2)}%`
                                    : '-'}
                                </span>
                              </span>
                            </>
                          )}
                          <span>
                            改价{' '}
                            <span className="text-content font-medium">
                              {orderPriceRatio !== undefined &&
                              orderPriceRatio < 1
                                ? `可改 ${((1 - orderPriceRatio) * 100).toFixed(0)}%`
                                : '不可改'}
                            </span>
                          </span>
                        </div>

                        {/* 财务统计 */}
                        {platformStat ? (
                          <div className="space-y-2">
                            {/* 主要指标 */}
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <div className="text-content-muted text-xs mb-0.5">
                                  收入
                                </div>
                                <div className="font-semibold text-base text-primary-600">
                                  {centsToYuan(
                                    platformStat.totalRevenue
                                  ).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                              <div>
                                <div className="text-content-muted text-xs mb-0.5">
                                  成本
                                </div>
                                <div className="font-semibold text-base">
                                  {centsToYuan(
                                    platformStat.totalCost
                                  ).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                              <div>
                                <Tooltip title="基础利润 = 收入 - 成本 + 返点收入">
                                  <div className="text-content-muted text-xs mb-0.5 cursor-help">
                                    基础利润
                                  </div>
                                </Tooltip>
                                <div className="font-semibold text-base">
                                  {centsToYuan(
                                    platformStat.baseProfit
                                  ).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                  })}
                                  <span
                                    className={`ml-1 text-xs ${platformStat.baseProfitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                                  >
                                    {platformStat.baseProfitRate.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div>
                                <Tooltip title="净利润 = 基础利润 + 调整项 - 资金占用费">
                                  <div className="text-content-muted text-xs mb-0.5 cursor-help">
                                    净利润
                                  </div>
                                </Tooltip>
                                <div
                                  className={`font-semibold text-base ${platformStat.totalProfit >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                                >
                                  {centsToYuan(
                                    platformStat.totalProfit
                                  ).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                  })}
                                  <span
                                    className={`ml-1 text-xs ${platformStat.profitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                                  >
                                    {platformStat.profitRate.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* 次要指标（返点收入、调整项、资金占用费） */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted pt-1 border-t border-stroke">
                              <span>
                                返点收入{' '}
                                <span className="text-success-600 font-medium">
                                  +
                                  {centsToYuan(
                                    platformStat.totalRebateIncome
                                  ).toLocaleString('zh-CN', {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </span>
                              {platformStat.totalAdjustments !== 0 && (
                                <span>
                                  调整项{' '}
                                  <span
                                    className={
                                      platformStat.totalAdjustments >= 0
                                        ? 'text-success-600'
                                        : 'text-danger-500'
                                    }
                                  >
                                    {platformStat.totalAdjustments >= 0
                                      ? '+'
                                      : ''}
                                    {centsToYuan(
                                      platformStat.totalAdjustments
                                    ).toLocaleString('zh-CN', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </span>
                              )}
                              {config.enableFundsOccupation &&
                                platformStat.totalFundsOccupation > 0 && (
                                  <span>
                                    资金占用费{' '}
                                    <span className="text-warning-600 font-medium">
                                      -
                                      {centsToYuan(
                                        platformStat.totalFundsOccupation
                                      ).toLocaleString('zh-CN', {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  </span>
                                )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-content-muted text-sm py-2">
                            暂无财务数据
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!project?.platforms || project.platforms.length === 0) && (
                    <div className="col-span-full text-center text-content-muted py-8">
                      暂无平台配置
                    </div>
                  )}
                </div>

                {/* 项目汇总统计 */}
                {projectFinanceStats && (
                  <div className="mt-4 pt-4 border-t border-stroke">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-6 text-base">
                        <div>
                          <span className="text-content-muted text-sm">
                            总收入
                          </span>
                          <span className="ml-2 font-semibold text-primary-600">
                            ¥
                            {centsToYuan(
                              projectFinanceStats.totalRevenue
                            ).toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-content-muted text-sm">
                            总成本
                          </span>
                          <span className="ml-2 font-semibold">
                            ¥
                            {centsToYuan(
                              projectFinanceStats.totalCost
                            ).toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-content-muted text-sm">
                            返点收入
                          </span>
                          <span className="ml-2 font-semibold text-success-600">
                            +¥
                            {centsToYuan(
                              projectFinanceStats.totalRebateIncome
                            ).toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        {projectFinanceStats.totalAdjustments !== 0 && (
                          <div>
                            <span className="text-content-muted text-sm">
                              调整项
                            </span>
                            <span
                              className={`ml-2 font-semibold ${projectFinanceStats.totalAdjustments >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                            >
                              {projectFinanceStats.totalAdjustments >= 0
                                ? '+'
                                : ''}
                              ¥
                              {centsToYuan(
                                projectFinanceStats.totalAdjustments
                              ).toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                        {config.enableFundsOccupation &&
                          projectFinanceStats.fundsOccupation !== undefined && (
                            <div>
                              <Tooltip
                                title={`月费率 ${config.fundsOccupationRate ?? 0.7}%，按日计算`}
                              >
                                <span className="text-content-muted text-sm cursor-help">
                                  资金占用费{' '}
                                  <InfoCircleOutlined className="text-xs" />
                                </span>
                              </Tooltip>
                              <span className="ml-2 font-semibold text-warning-600">
                                -¥
                                {centsToYuan(
                                  projectFinanceStats.fundsOccupation
                                ).toLocaleString('zh-CN', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                      </div>
                      <div className="flex items-center gap-4 text-base">
                        {/* 基础利润 */}
                        <div className="flex items-center gap-2">
                          <Tooltip title="基础利润 = 收入 - 成本 + 返点收入">
                            <span className="text-content-muted text-sm cursor-help">
                              基础利润
                            </span>
                          </Tooltip>
                          <span className="font-semibold">
                            ¥
                            {centsToYuan(
                              projectFinanceStats.baseProfit
                            ).toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Tag
                            color={
                              projectFinanceStats.baseProfitRate >= 0
                                ? 'default'
                                : 'error'
                            }
                          >
                            {projectFinanceStats.baseProfitRate.toFixed(1)}%
                          </Tag>
                        </div>
                        {/* 净利润 */}
                        <div className="flex items-center gap-2">
                          <Tooltip title="净利润 = 基础利润 + 调整项 - 资金占用费">
                            <span className="text-content-muted text-sm cursor-help">
                              净利润
                            </span>
                          </Tooltip>
                          <span
                            className={`text-xl font-bold ${projectFinanceStats.totalProfit >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                          >
                            ¥
                            {centsToYuan(
                              projectFinanceStats.totalProfit
                            ).toLocaleString('zh-CN', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <Tag
                            color={
                              projectFinanceStats.profitRate >= 0
                                ? 'success'
                                : 'error'
                            }
                          >
                            {projectFinanceStats.profitRate.toFixed(1)}%
                          </Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 财务明细表格 */}
            <div className="finance-section">
              <div className="finance-section__header">
                <h3 className="finance-section__title">
                  <span className="finance-section__title-icon">
                    <FundOutlined />
                  </span>
                  财务明细
                </h3>
                <div className="finance-section__actions">
                  <Space size="small">
                    <Button
                      size="small"
                      icon={<CheckSquareOutlined />}
                      onClick={() => actionRef.current?.reload()}
                    >
                      刷新
                    </Button>
                  </Space>
                </div>
              </div>
              <ProTable<Collaboration>
                columns={columns}
                actionRef={actionRef}
                cardBordered={false}
                dataSource={financeCollaborations}
                loading={loading}
                rowKey="id"
                expandable={{
                  expandedRowRender,
                  rowExpandable: () => true,
                }}
                rowSelection={{
                  selectedRowKeys,
                  onChange: keys => setSelectedRowKeys(keys as string[]),
                }}
                tableAlertRender={({ selectedRowKeys: keys }) => {
                  // 计算选中项的统计数据（表格已过滤，所有记录都参与计算）
                  const selectedItems = financeCollaborations.filter(c =>
                    keys.includes(c.id)
                  );
                  const stats = selectedItems.reduce(
                    (acc, item) => {
                      const revenue = item.finance?.revenue ?? 0;
                      const cost = item.finance?.cost ?? 0;
                      const profit = item.finance?.profit ?? 0;
                      const rebateIncome = item.finance?.rebateIncome ?? 0;
                      const adjustments = (item.adjustments || []).reduce(
                        (sum, adj) => sum + adj.amount,
                        0
                      );
                      // 计算资金占用费
                      let fundsOccupationFee = 0;
                      if (
                        config.enableFundsOccupation &&
                        item.orderDate &&
                        item.recoveryDate
                      ) {
                        const fundsResult = calculateSingleFundsOccupation(
                          item,
                          config.fundsOccupationRate ?? 0.7
                        );
                        if (fundsResult) {
                          fundsOccupationFee = fundsResult.fee;
                        }
                      }
                      return {
                        count: acc.count + 1,
                        revenue: acc.revenue + revenue,
                        cost: acc.cost + cost,
                        profit: acc.profit + profit,
                        rebateIncome: acc.rebateIncome + rebateIncome,
                        adjustments: acc.adjustments + adjustments,
                        fundsOccupation:
                          acc.fundsOccupation + fundsOccupationFee,
                      };
                    },
                    {
                      count: 0,
                      revenue: 0,
                      cost: 0,
                      profit: 0,
                      rebateIncome: 0,
                      adjustments: 0,
                      fundsOccupation: 0,
                    }
                  );
                  // 基础利润 = 收入 - 成本 + 返点收入（已在 profit 中）
                  const baseProfit = stats.profit;
                  const baseProfitRate =
                    stats.revenue > 0 ? (baseProfit / stats.revenue) * 100 : 0;
                  // 净利润 = 基础利润 + 调整项 - 资金占用费
                  const netProfit =
                    baseProfit + stats.adjustments - stats.fundsOccupation;
                  const netProfitRate =
                    stats.revenue > 0 ? (netProfit / stats.revenue) * 100 : 0;

                  return (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium">
                        已选择 {keys.length} 条
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        收入{' '}
                        <span className="font-semibold text-primary-500">
                          {formatMoney(stats.revenue)}
                        </span>
                      </span>
                      <span>
                        成本{' '}
                        <span className="font-semibold">
                          {formatMoney(stats.cost)}
                        </span>
                      </span>
                      <span>
                        返点{' '}
                        <span className="font-semibold text-success-600">
                          +{formatMoney(stats.rebateIncome)}
                        </span>
                      </span>
                      {stats.adjustments !== 0 && (
                        <span>
                          调整{' '}
                          <span
                            className={`font-semibold ${stats.adjustments >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                          >
                            {stats.adjustments >= 0 ? '+' : ''}
                            {formatMoney(stats.adjustments)}
                          </span>
                        </span>
                      )}
                      {config.enableFundsOccupation &&
                        stats.fundsOccupation > 0 && (
                          <span>
                            资金占用{' '}
                            <span className="font-semibold text-warning-600">
                              -{formatMoney(stats.fundsOccupation)}
                            </span>
                          </span>
                        )}
                      <span className="text-gray-300">|</span>
                      <span>
                        基础利润{' '}
                        <span className="font-semibold">
                          {formatMoney(baseProfit)}
                        </span>
                        <span
                          className={`ml-1 text-xs ${baseProfitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                        >
                          ({baseProfitRate.toFixed(1)}%)
                        </span>
                      </span>
                      <span>
                        净利润{' '}
                        <span
                          className={`font-semibold ${netProfit >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                        >
                          {formatMoney(netProfit)}
                        </span>
                        <span
                          className={`ml-1 text-xs ${netProfitRate >= 0 ? 'text-success-600' : 'text-danger-500'}`}
                        >
                          ({netProfitRate.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  );
                }}
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
                headerTitle={false}
                toolbar={{ settings: [] }}
                scroll={{ x: 800 }}
                options={false}
              />
            </div>

            {/* 结算文件管理（放在最底部） */}
            {config.enableSettlementFiles && (
              <div className="finance-section">
                <div className="finance-section__header">
                  <h3 className="finance-section__title">
                    <span className="finance-section__title-icon">
                      <FileOutlined />
                    </span>
                    结算文件管理
                    {settlementFiles.length > 0 && (
                      <Tag style={{ marginLeft: 8 }}>
                        {settlementFiles.length} 个文件
                      </Tag>
                    )}
                  </h3>
                  <div className="finance-section__actions">
                    <Upload
                      customRequest={handleUploadFile}
                      showUploadList={false}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    >
                      <Button
                        type="primary"
                        size="small"
                        icon={<UploadOutlined />}
                        loading={uploadingFile}
                      >
                        上传文件
                      </Button>
                    </Upload>
                  </div>
                </div>
                <div className="finance-section__body">
                  {settlementFiles.length === 0 ? (
                    <div className="finance-empty-state">
                      <FileOutlined className="finance-empty-state__icon" />
                      <div>暂无结算文件</div>
                      <div className="text-xs mt-1">
                        支持 PDF、Excel、Word、图片格式
                      </div>
                    </div>
                  ) : (
                    <div className="finance-files-grid">
                      {settlementFiles.map((file, index) => (
                        <div
                          key={`${file.url}-${index}`}
                          className="finance-file-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Tooltip title={file.name}>
                                <div className="text-sm font-medium truncate text-content">
                                  {file.name}
                                </div>
                              </Tooltip>
                              <div className="text-xs text-content-muted mt-0.5">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <div className="finance-file-card__actions">
                            <Space size={0}>
                              <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handlePreviewFile(file)}
                              />
                              <Button
                                type="text"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadFile(file)}
                              />
                              <Popconfirm
                                title="确定删除此文件？"
                                onConfirm={() => handleDeleteFile(file.url)}
                                okText="删除"
                                cancelText="取消"
                                okButtonProps={{ danger: true }}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  loading={deletingFileUrl === file.url}
                                />
                              </Popconfirm>
                            </Space>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* 广告投流 / 内容制作 - 空状态 */}
        {(activeBusinessTab === 'adPlacement' ||
          activeBusinessTab === 'contentProduction') && (
          <Card className="shadow-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-content-muted">
                  {BUSINESS_TYPES[activeBusinessTab]?.name || '该业务类型'}
                  暂无财务数据
                </span>
              }
            />
          </Card>
        )}

        {/* 全部 - 只显示项目级看板汇总 */}
        {activeBusinessTab === 'all' && (
          <Card className="shadow-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="全部业务类型汇总视图（开发中）"
            />
          </Card>
        )}

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
              initialValue={
                (config.adjustmentTypes || DEFAULT_ADJUSTMENT_TYPES)[0]
              }
            >
              <Select
                options={(
                  config.adjustmentTypes || DEFAULT_ADJUSTMENT_TYPES
                ).map(type => ({
                  label: type,
                  value: type,
                }))}
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
