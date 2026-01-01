/**
 * EffectTab (New Design) - 效果验收 Tab
 * v4.0.0 - 全新设计,基于 ByteProject 模式 + AgentWorks 设计语言
 *
 * 设计特点:
 * - 玻璃态卡片 + 动态光影效果
 * - T+7 / T+21 双周期切换
 * - 响应式全展开/紧凑视图
 * - CPM 达标状态高亮
 * - 播放量达成进度可视化
 */

import React, { useState, useMemo } from 'react';
import { Empty, Spin, App } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { Platform } from '../../../../types/talent';
import type { Collaboration } from '../../../../types/project';
import { formatMoney } from '../../../../types/project';
import { EffectSummary } from './EffectSummary';
import { useEffectData } from './useEffectData';
import { useEffectCalculations } from './useEffectCalculations';
import {
  TalentNameWithLinks,
  fromCollaboration,
} from '../../../../components/TalentNameWithLinks';
import './EffectTabNew.css';

export interface EffectTabNewProps {
  projectId: string;
  projectName?: string;
  platforms: Platform[];
  benchmarkCPM?: number;
  onRefresh?: () => void;
}

export const EffectTabNew: React.FC<EffectTabNewProps> = ({
  projectId,
  projectName,
  platforms: _platforms,
  benchmarkCPM = 10,
  onRefresh,
}) => {
  void _platforms;
  const { message } = App.useApp();

  // 状态管理 - 只支持 t7 和 t21
  const [period, setPeriod] = useState<'t7' | 't21'>('t21');
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');

  // 数据加载
  const { collaborations, loading, error } = useEffectData(projectId, period);

  // 数据计算
  const { stats, collaborations: enrichedCollabs } = useEffectCalculations(
    collaborations,
    period,
    benchmarkCPM
  );

  // 计算验收日期 (最后发布日期 + T+7/T+21 天)
  const acceptanceDate = useMemo(() => {
    if (collaborations.length === 0) return undefined;

    // 找到最后发布日期
    const releaseDates = collaborations
      .filter(c => c.actualReleaseDate)
      .map(c => new Date(c.actualReleaseDate!).getTime());

    if (releaseDates.length === 0) return undefined;

    const lastReleaseDate = new Date(Math.max(...releaseDates));
    const daysToAdd = period === 't7' ? 7 : 21;
    const acceptDate = new Date(lastReleaseDate);
    acceptDate.setDate(acceptDate.getDate() + daysToAdd);

    // 格式化为 YYYY-MM-DD
    return acceptDate.toISOString().split('T')[0];
  }, [collaborations, period]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    return num.toLocaleString('zh-CN');
  };

  // ProTable 列定义
  const columns = useMemo((): ProColumns<Collaboration>[] => {
    const baseColumns: ProColumns<Collaboration>[] = [
      {
        title: '达人昵称',
        dataIndex: 'talentName',
        width: 140,
        fixed: 'left',
        ellipsis: true,
        render: (_, record) => (
          <TalentNameWithLinks {...fromCollaboration(record)} />
        ),
      },
      {
        title: '刊例价格',
        dataIndex: 'amount',
        width: 100,
        render: (_, record) => formatMoney(record.amount),
      },
      {
        title: '发布时间',
        dataIndex: 'actualReleaseDate',
        width: 110,
        valueType: 'date',
      },
      {
        title: '播放量',
        dataIndex: ['effectData', period, 'plays'],
        width: 120,
        render: (_, record) => {
          const plays = record.effectData?.[period]?.plays;
          return plays ? (
            formatNumber(plays)
          ) : (
            <span className="text-gray-300">-</span>
          );
        },
      },
      {
        title: '总互动量',
        width: 120,
        render: (_, record) => {
          const effect = record.effectData?.[period];
          if (!effect) return <span className="text-gray-300">-</span>;
          const total =
            (effect.likes || 0) + (effect.comments || 0) + (effect.shares || 0);
          return formatNumber(total);
        },
      },
    ];

    // 详细数据列（仅在完整视图显示）
    if (viewMode === 'full') {
      baseColumns.push(
        {
          title: '点赞量',
          dataIndex: ['effectData', period, 'likes'],
          width: 100,
          render: (_, record) => {
            const likes = record.effectData?.[period]?.likes;
            return likes ? (
              formatNumber(likes)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '评论量',
          dataIndex: ['effectData', period, 'comments'],
          width: 100,
          render: (_, record) => {
            const comments = record.effectData?.[period]?.comments;
            return comments ? (
              formatNumber(comments)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '分享量',
          dataIndex: ['effectData', period, 'shares'],
          width: 100,
          render: (_, record) => {
            const shares = record.effectData?.[period]?.shares;
            return shares ? (
              formatNumber(shares)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '互动率',
          width: 100,
          render: (_, record: any) => {
            const rate = record.metrics?.interactionRate;
            return rate ? (
              `${rate.toFixed(2)}%`
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '赞播比',
          width: 100,
          render: (_, record: any) => {
            const ratio = record.metrics?.likeToViewRatio;
            return ratio ? (
              `${ratio.toFixed(2)}%`
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '组件展示量',
          dataIndex: ['effectData', period, 'componentImpressions'],
          width: 110,
          render: (_, record) => {
            const val = record.effectData?.[period]?.componentImpressions;
            return val ? (
              formatNumber(val)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '组件点击量',
          dataIndex: ['effectData', period, 'componentClicks'],
          width: 110,
          render: (_, record) => {
            const val = record.effectData?.[period]?.componentClicks;
            return val ? (
              formatNumber(val)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '组件点击率',
          width: 100,
          render: (_, record: any) => {
            const ctr = record.metrics?.ctr;
            return ctr ? (
              `${ctr.toFixed(2)}%`
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '视频完播率',
          dataIndex: ['effectData', period, 'completionRate'],
          width: 100,
          render: (_, record) => {
            const val = record.effectData?.[period]?.completionRate;
            return val ? (
              `${val.toFixed(2)}%`
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        },
        {
          title: '总触达人数',
          dataIndex: ['effectData', period, 'reach'],
          width: 110,
          render: (_, record) => {
            const val = record.effectData?.[period]?.reach;
            return val ? (
              formatNumber(val)
            ) : (
              <span className="text-gray-300">-</span>
            );
          },
        }
      );
    }

    // 共同列
    baseColumns.push(
      {
        title: 'CPM',
        width: 100,
        render: (_, record: any) => {
          const cpm = record.metrics?.cpm;
          if (!cpm) return <span className="text-gray-300">-</span>;

          const isAchieved = cpm <= benchmarkCPM;
          return (
            <span
              className={`font-semibold ${isAchieved ? 'text-emerald-600' : 'text-red-600'}`}
            >
              ¥{cpm.toFixed(2)}
              {isAchieved ? (
                <CheckCircleOutlined
                  className="ml-1"
                  style={{ color: '#10b981' }}
                />
              ) : (
                <ExclamationCircleOutlined
                  className="ml-1"
                  style={{ color: '#ef4444' }}
                />
              )}
            </span>
          );
        },
      },
      {
        title: 'CPE',
        width: 100,
        render: (_, record: any) => {
          const cpe = record.metrics?.cpe;
          return cpe ? (
            `¥${cpe.toFixed(2)}`
          ) : (
            <span className="text-gray-300">-</span>
          );
        },
      }
    );

    return baseColumns;
  }, [period, benchmarkCPM, viewMode]);

  // 错误状态
  if (error) {
    message.error(error);
  }

  return (
    <div className="effect-tab-new-container">
      {/* 顶部控制栏：时间维度 + 视图切换 */}
      <div className="effect-tab-controls">
        {/* 时间维度切换 - 胶囊按钮组 */}
        <div className="effect-tab-period-tabs">
          <button
            className={`effect-tab-period-btn ${period === 't7' ? 'active' : ''}`}
            onClick={() => setPeriod('t7')}
          >
            T+7 复盘
          </button>
          <button
            className={`effect-tab-period-btn ${period === 't21' ? 'active' : ''}`}
            onClick={() => setPeriod('t21')}
          >
            T+21 验收
          </button>
        </div>

        {/* 视图切换 - 胶囊按钮组 */}
        <div className="effect-tab-period-tabs">
          <button
            className={`effect-tab-period-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => setViewMode('compact')}
          >
            关键维度
          </button>
          <button
            className={`effect-tab-period-btn ${viewMode === 'full' ? 'active' : ''}`}
            onClick={() => setViewMode('full')}
          >
            所有维度
          </button>
        </div>
      </div>

      {loading ? (
        <div className="effect-tab-loading">
          <Spin size="large" tip="加载效果数据中..." />
        </div>
      ) : collaborations.length === 0 ? (
        <div className="effect-tab-empty">
          <Empty
            image={
              <LineChartOutlined style={{ fontSize: 64, color: '#cbd5e1' }} />
            }
            description="暂无已发布的合作记录"
          />
        </div>
      ) : (
        <>
          {/* 效果验收汇总 */}
          <EffectSummary
            projectName={projectName}
            currentViews={stats.totalViews || 0}
            targetViews={stats.targetViews || 0}
            achievementRate={stats.achievementRate || 0}
            viewsGap={stats.viewsGap || 0}
            actualCPM={stats.actualCPM || 0}
            targetCPM={benchmarkCPM}
            period={period}
            acceptanceDate={acceptanceDate}
          />

          {/* 达人效果明细表格 */}
          <div className="effect-tab-table-wrapper">
            <ProTable<Collaboration>
              columns={columns}
              dataSource={enrichedCollabs}
              rowKey="id"
              search={false}
              dateFormatter="string"
              headerTitle={`${period === 't7' ? 'T+7 复盘' : 'T+21 验收'} 效果明细`}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: total => `共 ${total} 条`,
              }}
              scroll={{ x: viewMode === 'full' ? 2200 : 1000 }}
              options={{
                fullScreen: true,
                density: true,
                setting: true,
                reload: () => {
                  onRefresh?.();
                },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default EffectTabNew;
