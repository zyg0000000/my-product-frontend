/**
 * 效果验收 Tab
 * 展示项目效果数据，支持 T+7 和 T+21 两种时间维度
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import {
  Card,
  Tag,
  Statistic,
  Row,
  Col,
  Progress,
  Tabs,
  InputNumber,
  Button,
  App,
  Empty,
} from 'antd';
import {
  PlayCircleOutlined,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { Collaboration, EffectMetrics } from '../../../types/project';
import { formatMoney, centsToYuan } from '../../../types/project';
import { PLATFORM_NAMES, type Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { logger } from '../../../utils/logger';

/**
 * 平台标签颜色
 */
const PLATFORM_COLORS: Record<Platform, string> = {
  douyin: 'blue',
  xiaohongshu: 'red',
  bilibili: 'cyan',
  kuaishou: 'orange',
};

/**
 * 效果汇总统计
 */
interface EffectSummary {
  totalPlays: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgCpm: number;
  avgCpe: number; // 互动成本
  recordedCount: number; // 已录入数量
  totalCount: number;
}

interface EffectTabProps {
  projectId: string;
  platforms: Platform[];
  benchmarkCPM?: number;
  onRefresh?: () => void;
}

type EffectPeriod = 't7' | 't21';

export function EffectTab({
  projectId,
  platforms: _platforms,
  benchmarkCPM,
  onRefresh,
}: EffectTabProps) {
  // platforms 参数保留用于后续平台筛选功能
  void _platforms;
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // 数据状态
  const [loading, setLoading] = useState(true);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [period, setPeriod] = useState<EffectPeriod>('t7');
  const [summary, setSummary] = useState<EffectSummary>({
    totalPlays: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgCpm: 0,
    avgCpe: 0,
    recordedCount: 0,
    totalCount: 0,
  });

  // 编辑状态
  const [editingData, setEditingData] = useState<
    Record<string, Partial<EffectMetrics>>
  >({});

  /**
   * 计算汇总统计
   */
  const calculateSummary = (
    data: Collaboration[],
    currentPeriod: EffectPeriod
  ): EffectSummary => {
    let totalPlays = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalCpm = 0;
    let totalAmount = 0;
    let recordedCount = 0;
    let cpmCount = 0;

    data.forEach(c => {
      const metrics = c.effectData?.[currentPeriod];
      if (metrics) {
        recordedCount++;
        totalPlays += metrics.plays || 0;
        totalLikes += metrics.likes || 0;
        totalComments += metrics.comments || 0;
        totalShares += metrics.shares || 0;

        if (metrics.cpm && metrics.cpm > 0) {
          totalCpm += metrics.cpm;
          cpmCount++;
        }

        totalAmount += c.amount;
      }
    });

    const totalInteractions = totalLikes + totalComments + totalShares;
    const avgCpm = cpmCount > 0 ? totalCpm / cpmCount : 0;
    const avgCpe =
      totalInteractions > 0 ? centsToYuan(totalAmount) / totalInteractions : 0;

    return {
      totalPlays,
      totalLikes,
      totalComments,
      totalShares,
      avgCpm,
      avgCpe,
      recordedCount,
      totalCount: data.filter(c => c.status === '视频已发布').length,
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
        pageSize: 500,
        status: '视频已发布', // 只加载已发布的
      });

      if (response.success) {
        setCollaborations(response.data.items);
        setSummary(calculateSummary(response.data.items, period));
      } else {
        setCollaborations([]);
        message.error('获取效果数据失败');
      }
    } catch (error) {
      logger.error('Error loading effect data:', error);
      message.error('获取效果数据失败');
      setCollaborations([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, period, message]);

  useEffect(() => {
    loadCollaborations();
  }, [loadCollaborations]);

  /**
   * 切换时间维度
   */
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod as EffectPeriod);
    setSummary(calculateSummary(collaborations, newPeriod as EffectPeriod));
    setEditingData({});
  };

  /**
   * 更新编辑数据
   */
  const handleEditChange = (
    id: string,
    field: keyof EffectMetrics,
    value: number | null
  ) => {
    setEditingData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value ?? undefined,
      },
    }));
  };

  /**
   * 保存单条效果数据
   */
  const handleSaveEffect = async (id: string) => {
    const editing = editingData[id];
    if (!editing) return;

    const collaboration = collaborations.find(c => c.id === id);
    if (!collaboration) return;

    try {
      // 计算 CPM
      const plays =
        editing.plays ?? collaboration.effectData?.[period]?.plays ?? 0;
      const amount = collaboration.amount;
      const cpm = plays > 0 ? (centsToYuan(amount) / plays) * 1000 : 0;

      const updatedEffectData = {
        ...collaboration.effectData,
        [period]: {
          ...collaboration.effectData?.[period],
          ...editing,
          cpm: Math.round(cpm * 100) / 100,
          recordedAt: new Date().toISOString(),
        },
      };

      const response = await projectApi.updateCollaboration(id, {
        effectData: updatedEffectData,
      });

      if (response.success) {
        message.success('保存成功');
        // 清除编辑状态
        setEditingData(prev => {
          const newData = { ...prev };
          delete newData[id];
          return newData;
        });
        loadCollaborations();
        onRefresh?.();
      }
    } catch (error) {
      message.error('保存失败');
    }
  };

  /**
   * 格式化大数字
   */
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  const columns: ProColumns<Collaboration>[] = [
    {
      title: '达人',
      dataIndex: 'talentName',
      width: 120,
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => record.talentName || record.talentOneId,
    },
    {
      title: '平台',
      dataIndex: 'talentPlatform',
      width: 90,
      render: (_, record) => (
        <Tag color={PLATFORM_COLORS[record.talentPlatform]}>
          {PLATFORM_NAMES[record.talentPlatform]}
        </Tag>
      ),
    },
    {
      title: '执行金额',
      dataIndex: 'amount',
      width: 100,
      render: (_, record) => (
        <span className="text-gray-600">{formatMoney(record.amount)}</span>
      ),
    },
    {
      title: '播放量',
      dataIndex: ['effectData', period, 'plays'],
      width: 120,
      render: (_, record) => {
        const current =
          editingData[record.id]?.plays ?? record.effectData?.[period]?.plays;
        return (
          <InputNumber
            value={current}
            onChange={v => handleEditChange(record.id, 'plays', v)}
            placeholder="输入"
            size="small"
            style={{ width: 100 }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') || 0)}
          />
        );
      },
    },
    {
      title: '点赞数',
      dataIndex: ['effectData', period, 'likes'],
      width: 100,
      render: (_, record) => {
        const current =
          editingData[record.id]?.likes ?? record.effectData?.[period]?.likes;
        return (
          <InputNumber
            value={current}
            onChange={v => handleEditChange(record.id, 'likes', v)}
            placeholder="输入"
            size="small"
            style={{ width: 80 }}
          />
        );
      },
    },
    {
      title: '评论数',
      dataIndex: ['effectData', period, 'comments'],
      width: 100,
      render: (_, record) => {
        const current =
          editingData[record.id]?.comments ??
          record.effectData?.[period]?.comments;
        return (
          <InputNumber
            value={current}
            onChange={v => handleEditChange(record.id, 'comments', v)}
            placeholder="输入"
            size="small"
            style={{ width: 80 }}
          />
        );
      },
    },
    {
      title: '转发数',
      dataIndex: ['effectData', period, 'shares'],
      width: 100,
      render: (_, record) => {
        const current =
          editingData[record.id]?.shares ?? record.effectData?.[period]?.shares;
        return (
          <InputNumber
            value={current}
            onChange={v => handleEditChange(record.id, 'shares', v)}
            placeholder="输入"
            size="small"
            style={{ width: 80 }}
          />
        );
      },
    },
    {
      title: 'CPM',
      dataIndex: ['effectData', period, 'cpm'],
      width: 80,
      render: (_, record) => {
        const cpm = record.effectData?.[period]?.cpm;
        if (!cpm) return '-';

        // CPM 颜色：低于基准为绿色，高于基准为红色
        const isGood = benchmarkCPM ? cpm <= benchmarkCPM : true;
        return (
          <span className={isGood ? 'text-green-600' : 'text-red-500'}>
            {cpm.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      fixed: 'right',
      render: (_, record) => {
        const hasEditing = editingData[record.id];
        return hasEditing ? (
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={() => handleSaveEffect(record.id)}
          >
            保存
          </Button>
        ) : null;
      },
    },
  ];

  // 录入进度
  const recordProgress =
    summary.totalCount > 0
      ? Math.round((summary.recordedCount / summary.totalCount) * 100)
      : 0;

  // CPM 达成率（低于基准为好）
  const cpmAchievement =
    benchmarkCPM && summary.avgCpm > 0
      ? Math.round((benchmarkCPM / summary.avgCpm) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 时间维度切换 */}
      <Tabs
        activeKey={period}
        onChange={handlePeriodChange}
        items={[
          { key: 't7', label: 'T+7 数据' },
          { key: 't21', label: 'T+21 数据' },
        ]}
        type="card"
      />

      {/* 效果看板 */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="总播放量"
              value={summary.totalPlays}
              prefix={<PlayCircleOutlined />}
              formatter={v => formatNumber(Number(v))}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="总点赞"
              value={summary.totalLikes}
              prefix={<LikeOutlined />}
              formatter={v => formatNumber(Number(v))}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="总评论"
              value={summary.totalComments}
              prefix={<MessageOutlined />}
              formatter={v => formatNumber(Number(v))}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" className="text-center">
            <Statistic
              title="总转发"
              value={summary.totalShares}
              prefix={<ShareAltOutlined />}
              formatter={v => formatNumber(Number(v))}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 指标看板 */}
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Card size="small" className="text-center">
            <div className="mb-2 text-gray-500">录入进度</div>
            <Progress
              type="circle"
              percent={recordProgress}
              size={80}
              format={() => `${summary.recordedCount}/${summary.totalCount}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="text-center">
            <div className="mb-2 text-gray-500">平均 CPM</div>
            <div className="text-3xl font-bold">
              <span
                className={
                  benchmarkCPM && summary.avgCpm <= benchmarkCPM
                    ? 'text-green-600'
                    : 'text-orange-500'
                }
              >
                {summary.avgCpm.toFixed(2)}
              </span>
            </div>
            {benchmarkCPM && (
              <div className="text-xs text-gray-400 mt-1">
                基准: {benchmarkCPM}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="text-center">
            <div className="mb-2 text-gray-500">CPM 达成率</div>
            <Progress
              type="circle"
              percent={Math.min(cpmAchievement, 100)}
              size={80}
              strokeColor={cpmAchievement >= 100 ? '#52c41a' : '#faad14'}
              format={() => `${cpmAchievement}%`}
            />
            <div className="text-xs text-gray-400 mt-1">
              {cpmAchievement >= 100 ? '达标' : '未达标'}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 达人明细表格 */}
      {collaborations.length > 0 ? (
        <ProTable<Collaboration>
          columns={columns}
          actionRef={actionRef}
          cardBordered={false}
          dataSource={collaborations}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: t => `共 ${t} 条`,
          }}
          search={false}
          dateFormatter="string"
          headerTitle={`${period === 't7' ? 'T+7' : 'T+21'} 效果明细`}
          toolBarRender={() => [
            <Button
              key="refresh"
              icon={<ReloadOutlined />}
              onClick={() => loadCollaborations()}
            >
              刷新
            </Button>,
          ]}
          scroll={{ x: 1000 }}
          options={{
            reload: false,
            density: false,
            setting: true,
          }}
          size="middle"
        />
      ) : (
        <Card>
          <Empty
            description="暂无已发布的合作记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
}

export default EffectTab;
