/**
 * 批量绑定达人到机构弹窗组件
 *
 * 功能：
 * 1. 上传 Excel 或粘贴文本数据
 * 2. 调用 match API 预览匹配结果
 * 3. 显示绑定状态（可绑定/已绑定其他机构/未找到）
 * 4. 用户勾选确认后执行绑定
 *
 * 两种模式：
 * - 单机构模式：从机构行操作进入，指定 initialAgency，绑定到该机构
 * - 多机构模式：从工具栏进入，不指定 initialAgency，Excel 包含机构名称列
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Modal,
  Button,
  Radio,
  Input,
  Table,
  Tag,
  Checkbox,
  Alert,
  Result,
  Upload,
  App,
  Tooltip,
} from 'antd';
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import {
  batchMatchTalents,
  batchBindAgency,
  batchBindAgencyByName,
  type BatchMatchResult,
  type BatchMatchTalentInput,
  type BindByNameTalentInput,
} from '../../api/talent';
import { parseExcelFile, parseTextData } from '../../utils/excelParser';
import { logger } from '../../utils/logger';
import type { Platform } from '../../types/talent';
import type { Agency } from '../../types/agency';

const { TextArea } = Input;

interface BatchBindTalentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** 预设的目标机构（从机构行操作进入时传入，传入则为单机构模式） */
  initialAgency?: Agency;
}

/** 扩展的匹配结果（包含 UI 状态） - 单机构模式 */
interface MatchResultWithUI extends BatchMatchResult {
  key: string;
  selected: boolean;
  rowIndex?: number; // 原始行号
}

/** 多机构模式的匹配结果 */
interface MultiAgencyMatchResult {
  key: string;
  rowIndex: number;
  input: {
    name?: string;
    platformAccountId?: string;
    agencyName?: string;
  };
  talent: {
    oneId: string;
    name: string;
    platformAccountId: string;
    platform: Platform;
    agencyId: string;
    agencyName: string;
  } | null;
  targetAgencyName: string; // Excel 中指定的目标机构名
  status: 'found' | 'not_found' | 'multiple_found' | 'agency_not_found';
  message?: string;
  selected: boolean;
}

export function BatchBindTalentModal({
  open,
  onClose,
  onSuccess,
  initialAgency,
}: BatchBindTalentModalProps) {
  const { message } = App.useApp();
  const { getPlatformList, getPlatformConfigByKey } = usePlatformConfig(false);
  const platforms = getPlatformList();

  // 模式判断：是否为单机构模式（有 initialAgency 时）
  const isSingleAgencyMode = !!initialAgency;

  // 表单状态
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(
    initialAgency?.id || ''
  );
  // 不预设平台，用户必须手动选择
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(
    null
  );

  // 数据输入
  const [rawText, setRawText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 单机构模式：匹配结果
  const [matchResults, setMatchResults] = useState<MatchResultWithUI[]>([]);
  const [matchSummary, setMatchSummary] = useState<{
    total: number;
    found: number;
    notFound: number;
    multipleFound: number;
  } | null>(null);

  // 多机构模式：匹配结果
  const [multiAgencyResults, setMultiAgencyResults] = useState<MultiAgencyMatchResult[]>([]);
  const [multiAgencySummary, setMultiAgencySummary] = useState<{
    total: number;
    found: number;
    notFound: number;
    agencyNotFound: number;
  } | null>(null);

  // 绑定选项
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // 绑定结果
  const [bindResult, setBindResult] = useState<{
    bound: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // 加载状态
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [binding, setBinding] = useState(false);

  // 解析警告
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  // 初始化
  useEffect(() => {
    if (open) {
      if (initialAgency) {
        setSelectedAgencyId(initialAgency.id);
      }
      // 不预设平台，让用户必须手动选择
    }
  }, [open, initialAgency]);

  // 统计 - 单机构模式
  const selectedCount = useMemo(
    () => matchResults.filter((r) => r.selected && r.status === 'found').length,
    [matchResults]
  );

  const canBindCount = useMemo(() => {
    return matchResults.filter((r) => {
      if (r.status !== 'found' || !r.talent) return false;
      // 可绑定条件：野生达人 或 勾选了覆盖选项
      const isWild =
        r.talent.agencyId === 'individual' ||
        r.talent.agencyId === selectedAgencyId;
      return r.selected && (isWild || overwriteExisting);
    }).length;
  }, [matchResults, overwriteExisting, selectedAgencyId]);

  // 统计 - 多机构模式
  const multiSelectedCount = useMemo(
    () => multiAgencyResults.filter((r) => r.selected && r.status === 'found').length,
    [multiAgencyResults]
  );

  const multiCanBindCount = useMemo(() => {
    return multiAgencyResults.filter((r) => {
      if (r.status !== 'found' || !r.talent) return false;
      // 可绑定条件：野生达人 或 已是目标机构 或 勾选了覆盖选项
      const isWild = r.talent.agencyId === 'individual';
      return r.selected && (isWild || overwriteExisting);
    }).length;
  }, [multiAgencyResults, overwriteExisting]);

  // 重置状态
  const resetState = useCallback(() => {
    setSelectedAgencyId(initialAgency?.id || '');
    setSelectedPlatform(null); // 不预设平台
    setRawText('');
    setUploadedFile(null);
    // 单机构模式
    setMatchResults([]);
    setMatchSummary(null);
    // 多机构模式
    setMultiAgencyResults([]);
    setMultiAgencySummary(null);
    // 通用
    setOverwriteExisting(false);
    setBindResult(null);
    setParsing(false);
    setMatching(false);
    setBinding(false);
    setParseWarnings([]);
  }, [initialAgency]);

  // 关闭弹窗
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 上传配置
  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    maxCount: 1,
    showUploadList: true,
    beforeUpload: (file) => {
      setUploadedFile(file);
      setRawText(''); // 清空文本输入
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setUploadedFile(null);
    },
  };

  // 解析并匹配
  const handleParseAndMatch = async () => {
    if (!selectedPlatform) {
      message.warning('请先选择平台');
      return;
    }
    // 单机构模式需要选择机构
    if (isSingleAgencyMode && !selectedAgencyId) {
      message.warning('请先选择目标机构');
      return;
    }
    if (!uploadedFile && !rawText.trim()) {
      message.warning('请上传 Excel 文件或粘贴数据');
      return;
    }

    setParsing(true);
    setParseWarnings([]);

    try {
      let parseResult;

      if (uploadedFile) {
        // 解析 Excel 文件
        parseResult = await parseExcelFile(uploadedFile, selectedPlatform);
      } else {
        // 解析粘贴的文本
        parseResult = parseTextData(rawText, selectedPlatform);
      }

      if (!parseResult.success) {
        message.error(parseResult.errors.join('\n'));
        setParsing(false);
        return;
      }

      if (parseResult.warnings.length > 0) {
        setParseWarnings(parseResult.warnings);
      }

      const parsedData = parseResult.data;

      if (parsedData.length === 0) {
        message.warning('解析完成，但没有有效的数据');
        setParsing(false);
        return;
      }

      if (parsedData.length > 500) {
        message.error(`单次匹配数量不能超过 500 条，当前 ${parsedData.length} 条`);
        setParsing(false);
        return;
      }

      // 多机构模式：检查是否有机构名称列
      if (!isSingleAgencyMode) {
        const hasAgencyColumn = parsedData.some((row) => row.agencyName);
        if (!hasAgencyColumn) {
          message.error('多机构模式需要 Excel 包含"机构名称"列');
          setParsing(false);
          return;
        }
        // 检查是否所有行都有机构名称
        const missingAgency = parsedData.filter((row) => !row.agencyName);
        if (missingAgency.length > 0) {
          setParseWarnings((prev) => [
            ...prev,
            `${missingAgency.length} 行缺少机构名称，将被跳过`,
          ]);
        }
      }

      // 构建匹配请求
      const talents: BatchMatchTalentInput[] = parsedData.map((row) => ({
        platformAccountId: row.platformAccountId,
        name: row.name,
      }));

      setParsing(false);
      setMatching(true);

      // 调用匹配 API
      const response = await batchMatchTalents(selectedPlatform, talents);

      if (!response.success || !response.data) {
        message.error(response.message || '匹配失败');
        setMatching(false);
        return;
      }

      if (isSingleAgencyMode) {
        // 单机构模式：原有逻辑
        const resultsWithUI: MatchResultWithUI[] = response.data.matched.map(
          (result, index) => ({
            ...result,
            key: `match_${index}`,
            selected:
              result.status === 'found' &&
              result.talent !== null &&
              (result.talent.agencyId === 'individual' ||
                result.talent.agencyId === selectedAgencyId),
            rowIndex: parsedData[index]?.rowIndex,
          })
        );

        setMatchResults(resultsWithUI);
        setMatchSummary(response.data.summary);
      } else {
        // 多机构模式：构建多机构结果

        const multiResults: MultiAgencyMatchResult[] = response.data.matched.map(
          (result, index) => {
            const parsedRow = parsedData[index];
            const targetAgencyName = parsedRow?.agencyName || '';

            // 没有机构名称的行标记为 agency_not_found
            let status: MultiAgencyMatchResult['status'] = result.status;
            let statusMessage = result.message;
            if (!targetAgencyName) {
              status = 'agency_not_found';
              statusMessage = '缺少目标机构名称';
            }

            return {
              key: `multi_${index}`,
              rowIndex: parsedRow?.rowIndex || index + 1,
              input: {
                name: parsedRow?.name,
                platformAccountId: parsedRow?.platformAccountId,
                agencyName: targetAgencyName,
              },
              talent: result.talent,
              targetAgencyName,
              status,
              message: statusMessage,
              // 默认选中：找到达人且有机构名称且是野生达人
              selected:
                result.status === 'found' &&
                result.talent !== null &&
                !!targetAgencyName &&
                result.talent.agencyId === 'individual',
            };
          }
        );

        setMultiAgencyResults(multiResults);

        // 统计
        const found = multiResults.filter((r) => r.status === 'found').length;
        const notFound = multiResults.filter((r) => r.status === 'not_found' || r.status === 'multiple_found').length;
        const agencyNotFound = multiResults.filter((r) => r.status === 'agency_not_found').length;

        setMultiAgencySummary({
          total: multiResults.length,
          found,
          notFound,
          agencyNotFound,
        });
      }

      message.success(
        `匹配完成：找到 ${response.data.summary.found}/${response.data.summary.total} 个达人`
      );
    } catch (error) {
      logger.error('解析/匹配失败:', error);
      message.error('解析/匹配失败，请稍后重试');
    } finally {
      setParsing(false);
      setMatching(false);
    }
  };

  // 切换单条选中状态 - 单机构模式
  const toggleSelection = (key: string) => {
    setMatchResults((prev) =>
      prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r))
    );
  };

  // 全选/取消全选 - 单机构模式
  const toggleSelectAll = (checked: boolean) => {
    setMatchResults((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.status === 'found' ? checked : false,
      }))
    );
  };

  // 切换单条选中状态 - 多机构模式
  const toggleMultiSelection = (key: string) => {
    setMultiAgencyResults((prev) =>
      prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r))
    );
  };

  // 全选/取消全选 - 多机构模式
  const toggleMultiSelectAll = (checked: boolean) => {
    setMultiAgencyResults((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.status === 'found' && !!r.targetAgencyName ? checked : false,
      }))
    );
  };

  // 执行绑定
  const handleBind = async () => {
    if (!selectedPlatform) return;

    setBinding(true);

    try {
      if (isSingleAgencyMode) {
        // 单机构模式
        if (!selectedAgencyId) return;

        const toBind = matchResults.filter((r) => {
          if (r.status !== 'found' || !r.talent || !r.selected) return false;
          const isWild =
            r.talent.agencyId === 'individual' ||
            r.talent.agencyId === selectedAgencyId;
          return isWild || overwriteExisting;
        });

        if (toBind.length === 0) {
          message.warning('没有可绑定的达人');
          setBinding(false);
          return;
        }

        const oneIds = toBind.map((r) => r.talent!.oneId);
        const response = await batchBindAgency(
          selectedPlatform,
          selectedAgencyId,
          oneIds,
          overwriteExisting
        );

        if (!response.success || !response.data) {
          message.error(response.message || '绑定失败');
          setBinding(false);
          return;
        }

        setBindResult({
          bound: response.data.bound,
          skipped: response.data.skipped,
          failed: response.data.failed,
        });

        if (response.data.bound > 0) {
          message.success(`成功绑定 ${response.data.bound} 个达人`);
        }
      } else {
        // 多机构模式
        const toBind = multiAgencyResults.filter((r) => {
          if (r.status !== 'found' || !r.talent || !r.selected || !r.targetAgencyName) return false;
          const isWild = r.talent.agencyId === 'individual';
          return isWild || overwriteExisting;
        });

        if (toBind.length === 0) {
          message.warning('没有可绑定的达人');
          setBinding(false);
          return;
        }

        // 构建多机构绑定请求
        const talents: BindByNameTalentInput[] = toBind.map((r) => ({
          oneId: r.talent!.oneId,
          agencyName: r.targetAgencyName,
        }));

        const response = await batchBindAgencyByName(
          selectedPlatform,
          talents,
          overwriteExisting
        );

        if (!response.success || !response.data) {
          message.error(response.message || '绑定失败');
          setBinding(false);
          return;
        }

        setBindResult({
          bound: response.data.bound,
          skipped: response.data.skipped,
          failed: response.data.failed,
        });

        if (response.data.bound > 0) {
          message.success(`成功绑定 ${response.data.bound} 个达人到各机构`);
        }

        // 显示失败详情
        if (response.data.errors && response.data.errors.length > 0) {
          const agencyErrors = response.data.errors.filter((e) =>
            e.reason.includes('机构不存在')
          );
          if (agencyErrors.length > 0) {
            message.warning(
              `${agencyErrors.length} 个达人因机构不存在而绑定失败`
            );
          }
        }
      }
    } catch (error) {
      logger.error('绑定失败:', error);
      message.error('绑定失败，请稍后重试');
    } finally {
      setBinding(false);
    }
  };

  // 完成
  const handleFinish = () => {
    if (bindResult && bindResult.bound > 0) {
      onSuccess?.();
    }
    handleClose();
  };

  // 返回编辑
  const handleBackToEdit = () => {
    // 单机构模式
    setMatchResults([]);
    setMatchSummary(null);
    // 多机构模式
    setMultiAgencyResults([]);
    setMultiAgencySummary(null);
        // 通用
    setBindResult(null);
  };

  // 渲染状态标签 - 单机构模式
  const renderStatusTag = (record: MatchResultWithUI) => {
    if (record.status === 'not_found') {
      return (
        <Tag icon={<CloseCircleOutlined />} color="error">
          未找到
        </Tag>
      );
    }
    if (record.status === 'multiple_found') {
      return (
        <Tooltip title={`找到 ${record.candidates?.length || 0} 个同名达人`}>
          <Tag icon={<QuestionCircleOutlined />} color="warning">
            同名
          </Tag>
        </Tooltip>
      );
    }
    if (record.talent) {
      const isWild = record.talent.agencyId === 'individual';
      const isSameAgency = record.talent.agencyId === selectedAgencyId;
      if (isWild) {
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            可绑定
          </Tag>
        );
      }
      if (isSameAgency) {
        return (
          <Tag icon={<CheckCircleOutlined />} color="processing">
            已绑定
          </Tag>
        );
      }
      return (
        <Tooltip title={`当前绑定：${record.talent.agencyName}`}>
          <Tag icon={<ExclamationCircleOutlined />} color="warning">
            已绑定[{record.talent.agencyName}]
          </Tag>
        </Tooltip>
      );
    }
    return null;
  };

  // 渲染状态标签 - 多机构模式
  const renderMultiStatusTag = (record: MultiAgencyMatchResult) => {
    if (record.status === 'not_found') {
      return (
        <Tag icon={<CloseCircleOutlined />} color="error">
          未找到
        </Tag>
      );
    }
    if (record.status === 'multiple_found') {
      return (
        <Tag icon={<QuestionCircleOutlined />} color="warning">
          同名
        </Tag>
      );
    }
    if (record.status === 'agency_not_found') {
      return (
        <Tag icon={<CloseCircleOutlined />} color="error">
          缺机构
        </Tag>
      );
    }
    if (record.talent) {
      const isWild = record.talent.agencyId === 'individual';
      if (isWild) {
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            可绑定
          </Tag>
        );
      }
      return (
        <Tooltip title={`当前绑定：${record.talent.agencyName}`}>
          <Tag icon={<ExclamationCircleOutlined />} color="warning">
            已绑定
          </Tag>
        </Tooltip>
      );
    }
    return null;
  };

  // 预览表格列定义
  const previewColumns: ColumnsType<MatchResultWithUI> = [
    {
      title: (
        <Checkbox
          checked={
            matchResults.filter((r) => r.status === 'found').length > 0 &&
            matchResults
              .filter((r) => r.status === 'found')
              .every((r) => r.selected)
          }
          indeterminate={
            matchResults.some((r) => r.status === 'found' && r.selected) &&
            !matchResults
              .filter((r) => r.status === 'found')
              .every((r) => r.selected)
          }
          onChange={(e) => toggleSelectAll(e.target.checked)}
          disabled={matchResults.filter((r) => r.status === 'found').length === 0}
        />
      ),
      dataIndex: 'selected',
      key: 'selected',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          disabled={record.status !== 'found'}
          onChange={() => toggleSelection(record.key)}
        />
      ),
    },
    {
      title: '输入昵称',
      key: 'inputName',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.input.name || '-',
    },
    {
      title: '输入平台ID',
      key: 'inputId',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.input.platformAccountId || '-',
    },
    {
      title: '匹配达人',
      key: 'matchedName',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.talent?.name || '-',
    },
    {
      title: '达人平台ID',
      key: 'matchedId',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.talent?.platformAccountId || '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 140,
      render: (_, record) => renderStatusTag(record),
    },
  ];

  // 多机构模式预览表格列定义
  const multiAgencyColumns: ColumnsType<MultiAgencyMatchResult> = [
    {
      title: (
        <Checkbox
          checked={
            multiAgencyResults.filter((r) => r.status === 'found' && r.targetAgencyName).length > 0 &&
            multiAgencyResults
              .filter((r) => r.status === 'found' && r.targetAgencyName)
              .every((r) => r.selected)
          }
          indeterminate={
            multiAgencyResults.some((r) => r.status === 'found' && r.targetAgencyName && r.selected) &&
            !multiAgencyResults
              .filter((r) => r.status === 'found' && r.targetAgencyName)
              .every((r) => r.selected)
          }
          onChange={(e) => toggleMultiSelectAll(e.target.checked)}
          disabled={multiAgencyResults.filter((r) => r.status === 'found' && r.targetAgencyName).length === 0}
        />
      ),
      dataIndex: 'selected',
      key: 'selected',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          disabled={record.status !== 'found' || !record.targetAgencyName}
          onChange={() => toggleMultiSelection(record.key)}
        />
      ),
    },
    {
      title: '输入昵称',
      key: 'inputName',
      width: 100,
      ellipsis: true,
      render: (_, record) => record.input.name || '-',
    },
    {
      title: '输入平台ID',
      key: 'inputId',
      width: 100,
      ellipsis: true,
      render: (_, record) => record.input.platformAccountId || '-',
    },
    {
      title: '目标机构',
      key: 'targetAgency',
      width: 100,
      ellipsis: true,
      render: (_, record) => (
        <span className={record.targetAgencyName ? 'text-content' : 'text-danger-500'}>
          {record.targetAgencyName || '未指定'}
        </span>
      ),
    },
    {
      title: '匹配达人',
      key: 'matchedName',
      width: 100,
      ellipsis: true,
      render: (_, record) => record.talent?.name || '-',
    },
    {
      title: '当前机构',
      key: 'currentAgency',
      width: 90,
      ellipsis: true,
      render: (_, record) => record.talent?.agencyName || '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: (_, record) => renderMultiStatusTag(record),
    },
  ];

  // 渲染结果内容
  const renderResultContent = () => {
    if (!bindResult) return null;

    const { bound, skipped, failed } = bindResult;

    if (bound > 0 && failed === 0) {
      return (
        <Result
          status="success"
          title="绑定成功"
          subTitle={
            <div>
              成功绑定{' '}
              <span className="text-success-600 dark:text-success-400 font-bold text-lg">
                {bound}
              </span>{' '}
              个达人
              {skipped > 0 && (
                <span className="text-content-secondary ml-2">
                  （跳过 {skipped} 个）
                </span>
              )}
            </div>
          }
        />
      );
    }

    if (bound > 0 && failed > 0) {
      return (
        <Result
          status="warning"
          title="部分绑定成功"
          subTitle={
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600 dark:text-success-400">
                  {bound}
                </div>
                <div className="text-sm text-content-secondary">成功</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-danger-600 dark:text-danger-400">
                  {failed}
                </div>
                <div className="text-sm text-content-secondary">失败</div>
              </div>
              {skipped > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-content-secondary">
                    {skipped}
                  </div>
                  <div className="text-sm text-content-secondary">跳过</div>
                </div>
              )}
            </div>
          }
        />
      );
    }

    return (
      <Result
        status="error"
        title="绑定失败"
        subTitle={`${failed} 个达人绑定失败`}
      />
    );
  };

  // 渲染主内容
  const renderContent = () => {
    // 显示绑定结果
    if (bindResult) {
      return renderResultContent();
    }

    // 显示匹配结果 - 单机构模式
    if (isSingleAgencyMode && matchResults.length > 0) {
      return (
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              匹配结果：
              <span className="text-success-600 dark:text-success-400 ml-2">
                找到 {matchSummary?.found || 0}
              </span>
              <span className="text-danger-600 dark:text-danger-400 ml-2">
                未找到 {matchSummary?.notFound || 0}
              </span>
              {(matchSummary?.multipleFound || 0) > 0 && (
                <span className="text-warning-600 dark:text-warning-400 ml-2">
                  同名 {matchSummary?.multipleFound}
                </span>
              )}
            </div>
            <div className="text-sm text-content-secondary">
              已选择 {selectedCount} 个
            </div>
          </div>

          {/* 已绑定提示 */}
          {matchResults.some(
            (r) =>
              r.status === 'found' &&
              r.talent &&
              r.talent.agencyId !== 'individual' &&
              r.talent.agencyId !== selectedAgencyId
          ) && (
            <Alert
              type="warning"
              showIcon
              message={
                <div className="flex items-center justify-between">
                  <span>部分达人已绑定其他机构</span>
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  >
                    覆盖已绑定的
                  </Checkbox>
                </div>
              }
            />
          )}

          {/* 匹配结果表格 */}
          <Table
            columns={previewColumns}
            dataSource={matchResults}
            rowKey="key"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
            rowClassName={(record) => {
              if (record.status === 'not_found') {
                return 'bg-danger-50 dark:bg-danger-900/20';
              }
              if (record.status === 'multiple_found') {
                return 'bg-warning-50 dark:bg-warning-900/20';
              }
              return '';
            }}
          />
        </div>
      );
    }

    // 显示匹配结果 - 多机构模式
    if (!isSingleAgencyMode && multiAgencyResults.length > 0) {
      return (
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              匹配结果：
              <span className="text-success-600 dark:text-success-400 ml-2">
                找到 {multiAgencySummary?.found || 0}
              </span>
              <span className="text-danger-600 dark:text-danger-400 ml-2">
                未找到 {multiAgencySummary?.notFound || 0}
              </span>
              {(multiAgencySummary?.agencyNotFound || 0) > 0 && (
                <span className="text-warning-600 dark:text-warning-400 ml-2">
                  缺机构 {multiAgencySummary?.agencyNotFound}
                </span>
              )}
            </div>
            <div className="text-sm text-content-secondary">
              已选择 {multiSelectedCount} 个
            </div>
          </div>

          {/* 已绑定提示 */}
          {multiAgencyResults.some(
            (r) =>
              r.status === 'found' &&
              r.talent &&
              r.talent.agencyId !== 'individual'
          ) && (
            <Alert
              type="warning"
              showIcon
              message={
                <div className="flex items-center justify-between">
                  <span>部分达人已绑定其他机构</span>
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  >
                    覆盖已绑定的
                  </Checkbox>
                </div>
              }
            />
          )}

          {/* 匹配结果表格 */}
          <Table
            columns={multiAgencyColumns}
            dataSource={multiAgencyResults}
            rowKey="key"
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
            rowClassName={(record) => {
              if (record.status === 'not_found' || record.status === 'agency_not_found') {
                return 'bg-danger-50 dark:bg-danger-900/20';
              }
              if (record.status === 'multiple_found') {
                return 'bg-warning-50 dark:bg-warning-900/20';
              }
              return '';
            }}
          />
        </div>
      );
    }

    // 输入阶段
    return (
      <div className="space-y-4">
        {/* 单机构模式：显示目标机构 */}
        {isSingleAgencyMode && (
          <div>
            <div className="text-sm text-content-secondary mb-2">目标机构</div>
            <div className="px-3 py-2 bg-surface-sunken rounded text-content">
              {initialAgency?.name}
            </div>
          </div>
        )}

        {/* 多机构模式：显示说明 */}
        {!isSingleAgencyMode && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="多机构绑定模式"
            description="Excel 中需包含「机构名称」列，系统将根据机构名称自动绑定到对应机构"
          />
        )}

        {/* 平台选择 */}
        <div>
          <div className="text-sm text-content-secondary mb-2">目标平台</div>
          <Radio.Group
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            {platforms.map((platform) => {
              const config = getPlatformConfigByKey(platform);
              return (
                <Radio.Button key={platform} value={platform}>
                  {config?.name || platform}
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </div>

        {/* 格式说明 */}
        {selectedPlatform && (
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <div className="font-medium mb-1">
                  {isSingleAgencyMode
                    ? '支持的列：平台ID（优先匹配）、达人昵称（备选匹配）'
                    : '支持的列：平台ID、达人昵称、机构名称（必填）'}
                </div>
                <div className="text-xs text-content-secondary">
                  Excel 首行为表头，支持智能识别列名（星图ID、蒲公英ID、达人昵称、机构名称等）
                </div>
              </div>
            }
          />
        )}

        {/* 文件上传 */}
        <div>
          <div className="text-sm text-content-secondary mb-2">
            上传 Excel 文件
          </div>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} disabled={!selectedPlatform}>
              选择文件
            </Button>
          </Upload>
          <div className="text-xs text-content-secondary mt-1">
            支持 .xlsx, .xls 格式
          </div>
        </div>

        {/* 分隔线 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-stroke" />
          <span className="text-xs text-content-secondary">或粘贴数据</span>
          <div className="flex-1 border-t border-stroke" />
        </div>

        {/* 粘贴区域 */}
        <div>
          <TextArea
            placeholder={
              selectedPlatform
                ? '在此粘贴从 Excel/飞书 复制的数据（Tab 或逗号分隔）...'
                : '请先选择平台'
            }
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setUploadedFile(null); // 清空文件
            }}
            rows={5}
            className="font-mono text-sm"
            disabled={!selectedPlatform}
          />
        </div>

        {/* 解析警告 */}
        {parseWarnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={
              <div>
                {parseWarnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            }
          />
        )}

        {/* 解析按钮 */}
        <div className="flex justify-end">
          <Button
            type="primary"
            onClick={handleParseAndMatch}
            loading={parsing || matching}
            disabled={
              !selectedPlatform ||
              (isSingleAgencyMode && !selectedAgencyId) ||
              (!uploadedFile && !rawText.trim())
            }
          >
            {parsing ? '解析中...' : matching ? '匹配中...' : '解析并匹配'}
          </Button>
        </div>
      </div>
    );
  };

  // 渲染底部按钮
  const renderFooter = () => {
    if (bindResult) {
      return (
        <div className="flex justify-between">
          <Button onClick={handleBackToEdit}>返回</Button>
          <Button type="primary" onClick={handleFinish}>
            完成
          </Button>
        </div>
      );
    }

    // 单机构模式：有匹配结果时
    if (isSingleAgencyMode && matchResults.length > 0) {
      return (
        <div className="flex justify-between">
          <Button onClick={handleBackToEdit}>返回编辑</Button>
          <Button
            type="primary"
            onClick={handleBind}
            loading={binding}
            disabled={canBindCount === 0}
          >
            确认绑定 {canBindCount > 0 ? `(${canBindCount})` : ''}
          </Button>
        </div>
      );
    }

    // 多机构模式：有匹配结果时
    if (!isSingleAgencyMode && multiAgencyResults.length > 0) {
      return (
        <div className="flex justify-between">
          <Button onClick={handleBackToEdit}>返回编辑</Button>
          <Button
            type="primary"
            onClick={handleBind}
            loading={binding}
            disabled={multiCanBindCount === 0}
          >
            确认绑定 {multiCanBindCount > 0 ? `(${multiCanBindCount})` : ''}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-end">
        <Button onClick={handleClose}>取消</Button>
      </div>
    );
  };

  return (
    <Modal
      title={
        initialAgency
          ? `批量绑定达人到 [${initialAgency.name}]`
          : '批量绑定达人到机构'
      }
      open={open}
      onCancel={handleClose}
      width={850}
      footer={renderFooter()}
      destroyOnHidden
    >
      <div className="py-2">{renderContent()}</div>
    </Modal>
  );
}

export default BatchBindTalentModal;
