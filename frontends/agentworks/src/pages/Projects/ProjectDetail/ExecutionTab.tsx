/**
 * 执行追踪 Tab
 * 展示项目执行进度，包括 KPI 面板和发布列表
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Form } from 'antd';
import {
  Card,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  App,
  Button,
  Tooltip,
  Select,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExportOutlined,
  CalendarOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CollaborationStatus,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_COLORS,
  formatMoney,
  isDelayed,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../components/TalentNameWithLinks';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { useTalentLinks } from '../../../hooks/useTalentLinks';
import { FINANCE_VALID_STATUSES } from '../../../utils/financeCalculator';

// 执行追踪 Tab 可用的状态筛选选项（排除"待提报工作台"和"工作台已提交"）
const EXECUTION_STATUS_OPTIONS: CollaborationStatus[] = [
  '客户已定档',
  '视频已发布',
];

/**
 * KPI 统计数据
 */
interface ExecutionStats {
  plannedCount: number; // 计划数（有计划发布日期）
  publishedCount: number; // 已发布数
  publishRate: number; // 发布率
  delayedCount: number; // 延期数
  upcomingCount: number; // 近7天待发布
}

interface ExecutionTabProps {
  projectId: string;
  platforms: Platform[];
  onRefresh?: () => void;
  /** 是否可编辑（项目状态为「执行中」时才可编辑） */
  editable?: boolean;
}

export function ExecutionTab({
  projectId,
  platforms,
  onRefresh,
  editable = true,
}: ExecutionTabProps) {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 平台配置
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );

  // 外链配置
  const { getCollaborationLinks } = useTalentLinks();

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [stats, setStats] = useState<ExecutionStats>({
    plannedCount: 0,
    publishedCount: 0,
    publishRate: 0,
    delayedCount: 0,
    upcomingCount: 0,
  });

  // 行内编辑状态
  const [editableKeys, setEditableKeys] = useState<React.Key[]>([]);
  const [editableForm] = Form.useForm();

  // 筛选状态（默认筛选"客户已定档"和"视频已发布"）
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('');
  const [statusFilter, setStatusFilter] = useState<CollaborationStatus[]>(
    FINANCE_VALID_STATUSES
  );

  /**
   * 计算统计数据
   */
  const calculateStats = (data: Collaboration[]): ExecutionStats => {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const plannedCount = data.filter(c => c.plannedReleaseDate).length;
    const publishedCount = data.filter(c => c.status === '视频已发布').length;
    const publishRate =
      plannedCount > 0 ? Math.round((publishedCount / plannedCount) * 100) : 0;

    const delayedCount = data.filter(c =>
      isDelayed(c.plannedReleaseDate, c.actualReleaseDate, c.status)
    ).length;

    const upcomingCount = data.filter(c => {
      if (c.status === '视频已发布' || !c.plannedReleaseDate) return false;
      const plannedDate = new Date(c.plannedReleaseDate);
      return plannedDate >= now && plannedDate <= in7Days;
    }).length;

    return {
      plannedCount,
      publishedCount,
      publishRate,
      delayedCount,
      upcomingCount,
    };
  };

  /**
   * 加载合作记录
   */
  const loadCollaborations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectApi.getCollaborations({
        projectId,
        page: 1,
        pageSize: 500, // 加载所有用于统计
        platform: platformFilter || undefined,
        statuses: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
      });

      if (response.success) {
        // 按计划发布日期排序
        const sorted = response.data.items.sort((a, b) => {
          if (!a.plannedReleaseDate && !b.plannedReleaseDate) return 0;
          if (!a.plannedReleaseDate) return 1;
          if (!b.plannedReleaseDate) return -1;
          return (
            new Date(a.plannedReleaseDate).getTime() -
            new Date(b.plannedReleaseDate).getTime()
          );
        });

        setCollaborations(sorted);
        setStats(calculateStats(sorted));
      } else {
        setCollaborations([]);
        message.error('获取执行数据失败');
      }
    } catch (error) {
      logger.error('Error loading execution data:', error);
      message.error('获取执行数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, platformFilter, statusFilter.join(','), message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 行内编辑保存
   * 关键：使用 editableForm.getFieldsValue() 获取表单实际输入值
   */
  const handleSaveRow = async (
    key: React.Key | React.Key[],
    _row: Collaboration & {
      plannedReleaseDate?: string | dayjs.Dayjs | null;
      actualReleaseDate?: string | dayjs.Dayjs | null;
      index?: number;
    },
    originRow: Collaboration & { index?: number }
  ) => {
    void _row; // 使用 form 数据而非 row 参数
    // 处理 key 可能是数组的情况
    const actualKey = Array.isArray(key) ? key[0] : key;
    try {
      // 从 antd Form 获取表单值
      const allFormValues = editableForm.getFieldsValue();
      // ProTable editable 会把字段存储为 record[key][fieldName] 的结构
      const formRowData = allFormValues[actualKey as string] || {};

      console.log('=== handleSaveRow called ===');
      console.log('key:', key);
      console.log('originRow:', originRow);
      console.log('allFormValues:', allFormValues);
      console.log('formRowData:', formRowData);

      // 使用表单数据，回退到原始数据
      const taskId = formRowData.taskId ?? originRow.taskId ?? null;
      const videoId = formRowData.videoId ?? originRow.videoId ?? null;
      const plannedValue =
        formRowData.plannedReleaseDate ?? originRow.plannedReleaseDate;
      const actualValue =
        formRowData.actualReleaseDate ?? originRow.actualReleaseDate;

      // 处理日期格式
      let plannedDate: string | null = null;
      if (plannedValue) {
        if (dayjs.isDayjs(plannedValue)) {
          plannedDate = plannedValue.format('YYYY-MM-DD');
        } else if (typeof plannedValue === 'string') {
          plannedDate = plannedValue;
        }
      }

      let actualDate: string | null = null;
      if (actualValue) {
        if (dayjs.isDayjs(actualValue)) {
          actualDate = actualValue.format('YYYY-MM-DD');
        } else if (typeof actualValue === 'string') {
          actualDate = actualValue;
        }
      }

      // 构建更新数据
      const updateData: Record<string, string | null> = {
        plannedReleaseDate: plannedDate,
        actualReleaseDate: actualDate,
        taskId: taskId,
        videoId: videoId,
      };

      console.log('updateData to send:', updateData);

      const response = await projectApi.updateCollaboration(
        originRow.id,
        updateData
      );
      console.log('API response:', response);

      if (response.success) {
        message.success('保存成功');
        loadCollaborations();
        onRefresh?.();
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      logger.error('Error saving row:', error);
      message.error('保存失败');
    }
  };

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人昵称',
      dataIndex: 'talentName',
      width: 140,
      fixed: 'left',
      ellipsis: true,
      search: false,
      editable: false,
      render: (_, record) => (
        <TalentNameWithLinks {...fromCollaboration(record)} />
      ),
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 100,
      search: false,
      editable: false,
      render: (_, record) => (
        <Tag color={platformColors[record.talentPlatform] || 'default'}>
          {platformNames[record.talentPlatform] || record.talentPlatform}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      search: false,
      editable: false,
      render: (_, record) => (
        <Tag color={COLLABORATION_STATUS_COLORS[record.status]}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 110,
      search: false,
      editable: false,
      render: (_, record) => (
        <span className="font-medium">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '计划发布',
      dataIndex: 'plannedReleaseDate',
      width: 140,
      search: false,
      valueType: 'date',
      fieldProps: {
        format: 'YYYY-MM-DD',
      },
      render: (_, record) => {
        const delayed = isDelayed(
          record.plannedReleaseDate,
          record.actualReleaseDate,
          record.status
        );
        return (
          <span className={delayed ? 'text-danger-500 font-medium' : ''}>
            {record.plannedReleaseDate
              ? dayjs(record.plannedReleaseDate).format('YYYY-MM-DD')
              : '-'}
          </span>
        );
      },
    },
    {
      title: '实际发布',
      dataIndex: 'actualReleaseDate',
      width: 140,
      search: false,
      valueType: 'date',
      fieldProps: {
        format: 'YYYY-MM-DD',
      },
      render: (_, record) =>
        record.actualReleaseDate
          ? dayjs(record.actualReleaseDate).format('YYYY-MM-DD')
          : '-',
    },
    {
      title: '延期状态',
      dataIndex: 'delayStatus',
      width: 90,
      search: false,
      editable: false,
      render: (_, record) => {
        const delayed = isDelayed(
          record.plannedReleaseDate,
          record.actualReleaseDate,
          record.status
        );
        if (!record.plannedReleaseDate) return '-';
        return delayed ? (
          <Tag color="error" icon={<WarningOutlined />}>
            已延期
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            正常
          </Tag>
        );
      },
    },
    {
      title: '星图任务ID',
      dataIndex: 'taskId',
      width: 200,
      search: false,
      valueType: 'text',
      fieldProps: {
        placeholder: '输入任务ID',
      },
      render: (_, record) => {
        // 获取 idField='taskId' 的外链
        const taskLinks = getCollaborationLinks(
          record.talentPlatform,
          { videoId: record.videoId, taskId: record.taskId },
          undefined,
          'taskId'
        );
        return (
          <Space size="small">
            <span className="text-content-secondary">
              {record.taskId || '-'}
            </span>
            {taskLinks.map(link => (
              <Tooltip key={link.name} title={link.name}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600"
                >
                  <ExportOutlined />
                </a>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: '视频ID',
      dataIndex: 'videoId',
      width: 200,
      search: false,
      valueType: 'text',
      fieldProps: {
        placeholder: '输入视频ID',
      },
      render: (_, record) => {
        // 获取 idField='videoId' 的外链
        const videoLinks = getCollaborationLinks(
          record.talentPlatform,
          { videoId: record.videoId, taskId: record.taskId },
          undefined,
          'videoId'
        );
        return (
          <Space size="small">
            <span className="text-content-secondary">
              {record.videoId || '-'}
            </span>
            {videoLinks.map(link => (
              <Tooltip key={link.name} title={link.name}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600"
                >
                  <ExportOutlined />
                </a>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record, __, action) => [
        <Tooltip key="edit" title={editable ? '编辑' : '项目已进入结算阶段，无法编辑'}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={!editable}
            onClick={() => {
              action?.startEditable?.(record.id);
            }}
          />
        </Tooltip>,
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI 面板 - 与 FinancialTab 保持一致的 6 列布局 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="计划数"
              value={stats.plannedCount}
              prefix={<CalendarOutlined />}
              suffix="条"
              styles={{ content: { color: '#1890ff', fontSize: '18px' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="已发布"
              value={stats.publishedCount}
              prefix={<CheckCircleOutlined />}
              suffix="条"
              styles={{ content: { color: '#52c41a', fontSize: '18px' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="发布率"
              value={stats.publishRate}
              suffix="%"
              styles={{
                content: {
                  color: stats.publishRate >= 80 ? '#52c41a' : '#faad14',
                  fontSize: '18px',
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="延期"
              value={stats.delayedCount}
              prefix={<WarningOutlined />}
              suffix="条"
              styles={{
                content: {
                  color: stats.delayedCount > 0 ? '#ff4d4f' : '#8c8c8c',
                  fontSize: '18px',
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="近7天待发"
              value={stats.upcomingCount}
              prefix={<ClockCircleOutlined />}
              suffix="条"
              styles={{ content: { color: '#faad14', fontSize: '18px' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card size="small" className="text-center">
            <Statistic
              title="待填发布日"
              value={
                stats.plannedCount - stats.publishedCount - stats.delayedCount
              }
              suffix="条"
              styles={{ content: { color: '#722ed1', fontSize: '18px' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 执行列表 */}
      <ProTable<Collaboration>
        columns={columns}
        actionRef={actionRef}
        cardBordered={false}
        dataSource={collaborations}
        loading={loading}
        rowKey="id"
        editable={editable ? {
          type: 'single',
          form: editableForm,
          editableKeys,
          onChange: setEditableKeys,
          onSave: handleSaveRow,
          actionRender: (_row, _config, dom) => [dom.save, dom.cancel],
          saveText: '保存',
          cancelText: '取消',
        } : undefined}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: t => `共 ${t} 条`,
        }}
        search={false}
        dateFormatter="string"
        headerTitle={false}
        toolBarRender={() => [
          <Select
            key="platform"
            placeholder="选择平台"
            allowClear
            style={{ width: 120 }}
            value={platformFilter || undefined}
            onChange={v => setPlatformFilter(v || '')}
            options={platforms.map(p => ({
              label: platformNames[p] || p,
              value: p,
            }))}
          />,
          <Select
            key="status"
            mode="multiple"
            placeholder="选择状态"
            allowClear
            maxTagCount="responsive"
            style={{ width: 200 }}
            value={statusFilter.length > 0 ? statusFilter : undefined}
            onChange={v => setStatusFilter(v || [])}
            options={EXECUTION_STATUS_OPTIONS.map(s => ({
              label: s,
              value: s,
            }))}
          />,
        ]}
        scroll={{ x: 1460 }}
        options={{
          fullScreen: true,
          reload: () => loadCollaborations(),
          density: true,
          setting: true,
        }}
      />
    </div>
  );
}

export default ExecutionTab;
