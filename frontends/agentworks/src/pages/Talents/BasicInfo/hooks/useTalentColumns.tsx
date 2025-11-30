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
import { formatPrice, formatRebate, getLatestPricesMap } from '../../../../utils/formatters';
import type { TalentTierConfig, LinkConfig } from '../../../../api/platformConfig';

export interface UseTalentColumnsOptions {
  platform: Platform;
  selectedPriceTier: string | null;
  agencies: Agency[];
  getTalentTiers: (platform: Platform) => TalentTierConfig[];
  getPlatformConfigByKey: (platform: Platform) => { links?: LinkConfig[] | null; link?: { template: string; idField: string } | null } | undefined;
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
  getTalentTiers,
  getPlatformConfigByKey,
  onMenuClick,
}: UseTalentColumnsOptions): ProColumns<Talent>[] {
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

  // 获取平台所有外链（支持多链接配置）- 使用 useCallback 包装
  const getPlatformLinks = useCallback(
    (talent: Talent): Array<{ name: string; label: string; url: string }> => {
      const config = getPlatformConfigByKey(talent.platform);
      if (!config) return [];

      // 兼容旧数据：如果有 links 用 links，否则从 link 转换
      const linksConfig: LinkConfig[] =
        config.links ||
        (config.link
          ? [
              {
                name: '外链',
                label: '链接',
                template: config.link.template,
                idField: config.link.idField,
              },
            ]
          : []);

      return linksConfig
        .map(link => {
          // 优先从 platformSpecific 获取 ID，回退到 platformAccountId
          const platformSpecificData = talent.platformSpecific as
            | Record<string, string>
            | undefined;
          const idValue =
            platformSpecificData?.[link.idField] || talent.platformAccountId;
          if (!idValue) return null;
          return {
            name: link.name,
            label: link.label,
            url: link.template.replace('{id}', idValue),
          };
        })
        .filter(
          (item): item is { name: string; label: string; url: string } =>
            item !== null
        );
    },
    [getPlatformConfigByKey]
  );

  const columns: ProColumns<Talent>[] = useMemo(
    () => [
      {
        title: '达人名称',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        fixed: 'left',
        ellipsis: true,
        render: (_, record) => {
          const links = getPlatformLinks(record);
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{record.name}</span>
              {links.length > 0 && (
                <div className="flex items-center gap-1">
                  {links.map((link, i) => (
                    <Tooltip key={i} title={link.name}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                      >
                        {link.label}
                      </a>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: '商业属性',
        dataIndex: 'agencyId',
        key: 'agencyId',
        width: 100,
        render: (_, record) => <Tag>{getAgencyName(record.agencyId)}</Tag>,
      },
      {
        title: '达人层级',
        dataIndex: 'talentTier',
        key: 'talentTier',
        width: 100,
        render: (_, record) => {
          if (!record.talentTier) {
            return <span className="text-gray-400 text-xs">-</span>;
          }
          // 从配置中获取该等级的颜色
          const tierConfig = getTalentTiers(platform).find(
            t => t.label === record.talentTier
          );
          if (tierConfig) {
            return (
              <Tag
                style={{
                  backgroundColor: tierConfig.bgColor,
                  color: tierConfig.textColor,
                  border: 'none',
                }}
              >
                {record.talentTier}
              </Tag>
            );
          }
          // 兜底：如果没找到配置，使用默认样式
          return <Tag>{record.talentTier}</Tag>;
        },
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
                <span className="text-xs text-gray-500">
                  +{record.talentType.length - 2}
                </span>
              )}
            </Space>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
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
                  <span className="text-gray-900 font-medium">
                    {formatPrice(price)}
                  </span>
                ) : (
                  <span className="text-gray-400">N/A</span>
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
            <span className="text-gray-900 font-medium">
              {formatRebate(record.currentRebate.rate)}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
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
        width: 180,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onMenuClick('edit', record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => onMenuClick('price', record)}
              className="text-primary-600 hover:text-primary-700"
            >
              价格
            </Button>
            <Button
              type="link"
              size="small"
              icon={<PercentageOutlined />}
              onClick={() => onMenuClick('rebate', record)}
              className="text-green-600 hover:text-green-700"
            >
              返点
            </Button>
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
    [platform, selectedPriceTier, getAgencyName, getPlatformLinks, getTalentTiers, onMenuClick]
  );

  return columns;
}
