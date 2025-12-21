/**
 * 对比统计摘要组件
 */

import { Card, Statistic, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ComparisonSummary } from '../types';

interface SummaryStatsProps {
  summary: ComparisonSummary | null;
  loading?: boolean;
}

export function SummaryStats({ summary, loading }: SummaryStatsProps) {
  if (!summary) {
    return null;
  }

  const stats = [
    {
      title: '总达人数',
      value: summary.total,
      icon: <CheckCircleOutlined className="text-primary-500" />,
      tooltip: 'AgentWorks 中的达人总数',
    },
    {
      title: '已匹配',
      value: summary.matched,
      suffix: `/ ${summary.total}`,
      icon: <CheckCircleOutlined className="text-success-500" />,
      tooltip: '在公司库中找到记录的达人数',
      highlight: 'green',
    },
    {
      title: '未匹配',
      value: summary.unmatched,
      icon: <CloseCircleOutlined className="text-content-muted" />,
      tooltip: '在公司库中没有找到记录的达人数',
    },
    {
      title: '可同步',
      value: summary.canSync,
      icon: <SwapOutlined className="text-info-500" />,
      tooltip: '机构一致且公司库返点更高，可直接同步',
      highlight: 'blue',
    },
    {
      title: '仅参考',
      value: summary.referenceOnly,
      icon: <InfoCircleOutlined className="text-warning-500" />,
      tooltip: '跨机构返点更高，仅作参考不可直接同步',
    },
    {
      title: '公司更高',
      value: summary.companyHigher,
      icon: <ArrowUpOutlined className="text-warning-500" />,
      tooltip: '公司库返点高于当前返点的数量',
      highlight: 'orange',
    },
    {
      title: '我方更高',
      value: summary.awHigher,
      icon: <ArrowDownOutlined className="text-success-500" />,
      tooltip: '当前返点高于公司库的数量',
    },
    {
      title: '一致',
      value: summary.equal,
      icon: <CheckCircleOutlined className="text-content-muted" />,
      tooltip: '返点相同的数量',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {stats.map(stat => (
        <Card
          key={stat.title}
          size="small"
          className={`
            ${stat.highlight === 'green' ? 'border-success-200 dark:border-success-800 bg-success-50/30 dark:bg-success-900/20' : ''}
            ${stat.highlight === 'blue' ? 'border-info-200 dark:border-info-800 bg-info-50/30 dark:bg-info-900/20' : ''}
            ${stat.highlight === 'orange' ? 'border-warning-200 dark:border-warning-800 bg-warning-50/30 dark:bg-warning-900/20' : ''}
          `}
          loading={loading}
        >
          <Tooltip title={stat.tooltip}>
            <Statistic
              title={
                <span className="text-xs text-content-secondary flex items-center gap-1">
                  {stat.icon}
                  {stat.title}
                </span>
              }
              value={stat.value}
              suffix={stat.suffix}
              valueStyle={{ fontSize: 20 }}
            />
          </Tooltip>
        </Card>
      ))}
    </div>
  );
}
