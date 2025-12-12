/**
 * 达人表格列配置 Hook
 * 从 BasicInfo 拆分出来的独立 Hook
 */

import { useMemo, useCallback } from 'react';
import { Button, Dropdown, Space, Tag, Tooltip } from 'antd';
import type { ProColumns } from '@ant-design/pro-components';
import {
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  PercentageOutlined,
  EyeOutlined,
  HistoryOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { Talent, Platform, PriceType } from '../../../../types/talent';
import type { Agency } from '../../../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../../../types/agency';
import {
  formatPrice,
  formatRebate,
  getLatestPricesMap,
} from '../../../../utils/formatters';
import { TalentNameWithLinks } from '../../../../components/TalentNameWithLinks';
import type { LinkConfig } from '../../../../api/platformConfig';

export interface UseTalentColumnsOptions {
  platform: Platform;
  selectedPriceTier: string | null;
  agencies: Agency[];
  getPlatformConfigByKey: (platform: Platform) =>
    | {
        links?: LinkConfig[] | null;
        link?: { template: string; idField: string } | null;
      }
    | undefined;
  onMenuClick: (key: string, record: Talent) => void;
}

/**
 * 字符串转颜色（用于标签）
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#E3F2FD',
    '#F3E5F5',
    '#FCE4EC',
    '#FFF3E0',
    '#FFF8E1',
    '#F1F8E9',
    '#E8F5E9',
    '#E0F2F1',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function useTalentColumns({
  platform,
  selectedPriceTier,
  agencies,
  getPlatformConfigByKey: _getPlatformConfigByKey,
  onMenuClick,
}: UseTalentColumnsOptions): ProColumns<Talent>[] {
  // Note: _getPlatformConfigByKey 保留用于未来扩展，当前组件使用 TalentNameWithLinks 内部的 hook
  // 获取机构名称 - 使用 useCallback 包装
  const getAgencyName = useCallback(
    (agencyId?: string): string => {
      if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
        return '野生达人';
      }
      const agency = agencies.find(a => a.id === agencyId);
      return agency?.name || '未知机构';
    },
    [agencies]
  );

  const columns: ProColumns<Talent>[] = useMemo(
    () => [
      {
        title: '达人昵称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        fixed: 'left',
        ellipsis: true,
        render: (_, record) => (
          <TalentNameWithLinks
            name={record.name}
            platform={record.platform}
            platformAccountId={record.platformAccountId}
            platformSpecific={record.platformSpecific}
          />
        ),
      },
      {
        title: '商业属性',
        dataIndex: 'agencyId',
        key: 'agencyId',
        width: 100,
        render: (_, record) => <Tag>{getAgencyName(record.agencyId)}</Tag>,
      },
      {
        title: '内容标签',
        dataIndex: 'talentType',
        key: 'talentType',
        width: 160,
        render: (_, record) =>
          record.talentType && record.talentType.length > 0 ? (
            <Space size="small" wrap>
              {record.talentType.slice(0, 2).map((tag, index) => (
                <Tag
                  key={index}
                  style={{
                    backgroundColor: stringToColor(tag),
                    color: '#374151',
                  }}
                >
                  {tag}
                </Tag>
              ))}
              {record.talentType.length > 2 && (
                <span className="text-xs text-content-muted">
                  +{record.talentType.length - 2}
                </span>
              )}
            </Space>
          ) : (
            <span className="text-content-muted text-xs">-</span>
          ),
      },
      // 价格列（根据选中的价格类型显示，如果是 null 则隐藏）
      ...(selectedPriceTier
        ? [
            {
              title: '当月价格',
              key: 'price',
              width: 100,
              render: (_: unknown, record: Talent) => {
                const latestPrices = getLatestPricesMap(record.prices);
                const price = latestPrices[selectedPriceTier as PriceType];
                return price ? (
                  <span className="text-content font-medium">
                    {formatPrice(price)}
                  </span>
                ) : (
                  <span className="text-content-muted">N/A</span>
                );
              },
            },
          ]
        : []),
      {
        title: '返点',
        key: 'rebate',
        width: 80,
        render: (_, record) =>
          record.currentRebate?.rate !== undefined ? (
            <span className="text-content font-medium">
              {formatRebate(record.currentRebate.rate)}
            </span>
          ) : (
            <span className="text-content-muted">-</span>
          ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        render: (_, record) => (
          <Tag
            color={
              record.status === 'active'
                ? 'success'
                : record.status === 'inactive'
                  ? 'warning'
                  : 'default'
            }
          >
            {record.status === 'active'
              ? '活跃'
              : record.status === 'inactive'
                ? '暂停'
                : '归档'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 130,
        fixed: 'right',
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onMenuClick('edit', record)}
              />
            </Tooltip>
            <Tooltip title="价格">
              <Button
                type="text"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => onMenuClick('price', record)}
                className="text-primary-600 hover:text-primary-700"
              />
            </Tooltip>
            <Tooltip title="返点">
              <Button
                type="text"
                size="small"
                icon={<PercentageOutlined />}
                onClick={() => onMenuClick('rebate', record)}
                className="text-success-600 dark:text-success-400 hover:text-success-700 dark:text-success-300"
              />
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'detail',
                    label: '详情',
                    icon: <EyeOutlined />,
                  },
                  {
                    key: 'history',
                    label: '合作历史',
                    icon: <HistoryOutlined />,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'delete',
                    label: '删除',
                    icon: <DeleteOutlined />,
                    danger: true,
                  },
                ],
                onClick: ({ key }) => onMenuClick(key, record),
              }}
              trigger={['click']}
            >
              <Button size="small" type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ),
      },
    ],
    [platform, selectedPriceTier, getAgencyName, onMenuClick]
  );

  return columns;
}
