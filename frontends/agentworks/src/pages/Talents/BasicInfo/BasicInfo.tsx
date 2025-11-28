/**
 * 达人基础信息页 - v2.2 (Ant Design Pro 升级版)
 *
 * 升级要点：
 * 1. ProTable 替代手写 table
 * 2. Ant Design Tabs 替代手写平台切换
 * 3. Dropdown 替代手写操作菜单
 * 4. message API 替代 alert 和 Toast
 * 5. 筛选面板采用左右两栏布局（参考 Performance 页面）
 * 6. 价格选择器移至 toolbar 工具栏
 * 7. 筛选面板默认折叠
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';
import { Tabs, Button, Dropdown, Space, Tag, Select, message, Checkbox, Input } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  PercentageOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  CloseOutlined,
  MoreOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { logger } from '../../../utils/logger';
import { getTalents, updateTalent, deleteTalent, deleteTalentAll } from '../../../api/talent';
import type { Talent, Platform, PriceType } from '../../../types/talent';
import { PLATFORM_NAMES } from '../../../types/talent';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import {
  formatPrice,
  formatRebate,
  getLatestPricesMap,
} from '../../../utils/formatters';
import { PriceModal } from '../../../components/PriceModal';
import { EditTalentModal } from '../../../components/EditTalentModal';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal';
import { RebateManagementModal } from '../../../components/RebateManagementModal';
import { BatchCreateTalentModal } from '../../../components/BatchCreateTalentModal';
import { getAgencies } from '../../../api/agency';
import type { Agency } from '../../../types/agency';
import { AGENCY_INDIVIDUAL_ID } from '../../../types/agency';
import { TableSkeleton } from '../../../components/Skeletons/TableSkeleton';
import { PageTransition } from '../../../components/PageTransition';

export function BasicInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const actionRef = useRef<ActionType>(null);

  // 使用平台配置 Hook（只获取启用的平台）
  const { getPlatformList, getTalentTiers, getPlatformPriceTypes, loading: configLoading } = usePlatformConfig(false);
  const platforms = getPlatformList();

  // 从路由状态获取平台，如果没有则默认为第一个平台
  const initialPlatform = (location.state?.selectedPlatform as Platform) || (platforms[0] || 'douyin');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTalents, setTotalTalents] = useState(0);

  // 弹窗状态
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [rebateModalOpen, setRebateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [batchCreateModalOpen, setBatchCreateModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // 默认折叠
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rebateMin, setRebateMin] = useState<string>('');
  const [rebateMax, setRebateMax] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');

  // 获取平台的默认价格档位（使用动态配置）
  const getDefaultPriceTier = (platform: Platform): string | null => {
    const platformPriceTypes = getPlatformPriceTypes(platform);
    if (platformPriceTypes && platformPriceTypes.length > 0) {
      // 使用数据库配置的第一个价格类型作为默认值
      return platformPriceTypes[0].key;
    }
    return null;
  };

  // 价格档位选择状态（不使用 localStorage）
  const [selectedPriceTier, setSelectedPriceTier] = useState<string | null>(() => {
    return getDefaultPriceTier(selectedPlatform);
  });

  // 价格类型配置（使用动态配置）
  const priceTypes = getPlatformPriceTypes(selectedPlatform);

  // 组件挂载后清除路由状态
  useEffect(() => {
    if (location.state?.selectedPlatform) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // 切换平台时更新状态
  useEffect(() => {
    setCurrentPage(1);
    // 切换平台时更新默认价格档位
    setSelectedPriceTier(getDefaultPriceTier(selectedPlatform));
  }, [selectedPlatform]);

  // 加载达人数据
  useEffect(() => {
    loadTalents();
  }, [
    configLoading,
    platforms.length,
    selectedPlatform,
    currentPage,
    searchTerm,
    selectedTiers,
    selectedTags,
    rebateMin,
    rebateMax,
    priceMin,
    priceMax,
  ]);

  // 加载机构列表
  useEffect(() => {
    loadAgencies();
  }, []);

  const loadTalents = async () => {
    // 等待平台配置加载完成
    if (configLoading || platforms.length === 0) {
      return;
    }

    try {
      setLoading(true);

      const params: any = {
        platform: selectedPlatform,
        page: currentPage,
        limit: pageSize,
        sortBy: 'updatedAt',
        order: 'desc'
      };

      if (searchTerm) params.searchTerm = searchTerm;
      if (selectedTiers.length > 0) params.tiers = selectedTiers;
      if (selectedTags.length > 0) params.tags = selectedTags;
      if (rebateMin) params.rebateMin = parseFloat(rebateMin);
      if (rebateMax) params.rebateMax = parseFloat(rebateMax);
      if (priceMin) params.priceMin = parseFloat(priceMin);
      if (priceMax) params.priceMax = parseFloat(priceMax);

      const response = await getTalents(params);

      if (response.success && response.data) {
        const talentsData = Array.isArray(response.data)
          ? response.data
          : [response.data];

        setTalents(talentsData);

        if (response.total !== undefined) {
          setTotalTalents(response.total);
        } else if (response.count !== undefined) {
          setTotalTalents(response.count);
        }
      } else {
        setTalents([]);
        setTotalTalents(0);
      }
    } catch (err) {
      logger.error('加载达人列表失败:', err);
      message.error('加载达人列表失败');
      setTalents([]);
      setTotalTalents(0);
    } finally {
      setLoading(false);
    }
  };

  const loadAgencies = async () => {
    try {
      const response = await getAgencies();
      if (response.success && response.data) {
        setAgencies(response.data);
      }
    } catch (error) {
      logger.error('加载机构列表失败:', error);
    }
  };

  // 获取机构名称
  const getAgencyName = (agencyId?: string): string => {
    if (!agencyId || agencyId === AGENCY_INDIVIDUAL_ID) {
      return '野生达人';
    }
    const agency = agencies.find(a => a.id === agencyId);
    return agency?.name || '未知机构';
  };

  // 获取平台外链
  const getPlatformLink = (talent: Talent): string | null => {
    if (talent.platform === 'douyin') {
      const xingtuId = talent.platformSpecific?.xingtuId || talent.platformAccountId;
      return `https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/${xingtuId}`;
    }
    return null;
  };

  // 获取唯一的达人层级
  const getUniqueTalentTiers = (): string[] => {
    const tiers = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentTier) {
        tiers.add(talent.talentTier);
      }
    });
    return Array.from(tiers).sort();
  };

  // 获取唯一的内容标签
  const getUniqueTalentTypes = (): string[] => {
    const types = new Set<string>();
    talents.forEach(talent => {
      if (talent.talentType && Array.isArray(talent.talentType)) {
        talent.talentType.forEach(type => types.add(type));
      }
    });
    return Array.from(types).sort();
  };

  // 字符串转颜色（用于标签）
  const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#E3F2FD', '#F3E5F5', '#FCE4EC', '#FFF3E0',
      '#FFF8E1', '#F1F8E9', '#E8F5E9', '#E0F2F1',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // 处理菜单点击
  const handleMenuClick = (key: string, record: Talent) => {
    switch (key) {
      case 'edit':
        handleOpenEditModal(record);
        break;
      case 'price':
        handleOpenPriceModal(record);
        break;
      case 'rebate':
        handleOpenRebateModal(record);
        break;
      case 'detail':
        navigate(`/talents/${record.oneId}/${record.platform}`);
        break;
      case 'history':
        message.info('合作历史功能即将上线，敬请期待！');
        break;
      case 'delete':
        handleOpenDeleteModal(record);
        break;
    }
  };

  // 打开价格管理弹窗
  const handleOpenPriceModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setPriceModalOpen(true);
  };

  // 打开返点管理弹窗
  const handleOpenRebateModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setRebateModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setEditModalOpen(true);
  };

  // 打开删除确认弹窗
  const handleOpenDeleteModal = (talent: Talent) => {
    setSelectedTalent(talent);
    setDeleteModalOpen(true);
  };

  // 关闭价格管理弹窗
  const handleClosePriceModal = async () => {
    setPriceModalOpen(false);
    setSelectedTalent(null);
    await loadTalents();
  };

  // 保存价格
  const handleSavePrices = async () => {
    // 价格保存逻辑由 PriceModal 内部处理
    await loadTalents();
  };

  // 关闭返点管理弹窗
  const handleCloseRebateModal = async () => {
    setRebateModalOpen(false);
    setSelectedTalent(null);
    await loadTalents();
  };

  // 关闭编辑弹窗
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedTalent(null);
  };

  // 关闭删除弹窗
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedTalent(null);
  };

  // 保存达人信息
  const handleSaveTalent = async (updatedTalent: Partial<Talent>) => {
    if (!updatedTalent.oneId || !updatedTalent.platform) {
      message.error('缺少必要参数');
      return;
    }

    try {
      const response = await updateTalent({
        oneId: updatedTalent.oneId,
        platform: updatedTalent.platform as Platform,
        ...updatedTalent
      });

      if (!response.success) {
        throw new Error(response.error || response.message || '更新失败');
      }

      message.success('达人信息更新成功');
      await loadTalents();
    } catch (err) {
      logger.error('保存达人信息失败:', err);
      const errorMessage = err instanceof Error ? err.message : '保存达人信息失败';
      message.error(errorMessage);
      throw err;
    }
  };

  // 确认删除
  const handleConfirmDelete = async (oneId: string, platform: Platform, deleteAll: boolean) => {
    try {
      let response;
      if (deleteAll) {
        response = await deleteTalentAll(oneId);
      } else {
        response = await deleteTalent(oneId, platform);
      }

      if (!response.success) {
        throw new Error(response.error || response.message || '删除失败');
      }

      message.success(
        deleteAll
          ? '已删除该达人的所有平台数据'
          : `已删除该达人的${PLATFORM_NAMES[platform]}平台数据`
      );

      await loadTalents();
    } catch (err) {
      logger.error('删除达人失败:', err);
      const errorMessage = err instanceof Error ? err.message : '删除达人失败';
      message.error(errorMessage);
      throw err;
    }
  };

  // 处理层级筛选
  const handleTierChange = (tier: string) => {
    setSelectedTiers(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    );
    setCurrentPage(1);
  };

  // 处理标签筛选
  const handleTagChange = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  // 重置筛选条件
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTiers([]);
    setSelectedTags([]);
    setRebateMin('');
    setRebateMax('');
    setPriceMin('');
    setPriceMax('');
    setCurrentPage(1);
  };

  // 执行搜索
  const handleSearch = () => {
    setCurrentPage(1);
    loadTalents();
  };

  // 计算是否有激活的筛选
  const hasActiveFilters = useMemo(() => {
    return searchTerm ||
      selectedTiers.length > 0 ||
      selectedTags.length > 0 ||
      rebateMin || rebateMax ||
      priceMin || priceMax;
  }, [searchTerm, selectedTiers, selectedTags, rebateMin, rebateMax, priceMin, priceMax]);

  // 生成已选筛选条件的标签
  const activeFilterTags = useMemo(() => {
    const tags: { id: string; label: string; onRemove: () => void }[] = [];

    // 搜索关键词
    if (searchTerm) {
      tags.push({
        id: 'search',
        label: `搜索: "${searchTerm}"`,
        onRemove: () => {
          setSearchTerm('');
          setCurrentPage(1);
        }
      });
    }

    // 达人层级
    selectedTiers.forEach(tier => {
      tags.push({
        id: `tier-${tier}`,
        label: `层级: ${tier}`,
        onRemove: () => handleTierChange(tier)
      });
    });

    // 内容标签
    selectedTags.forEach(tag => {
      tags.push({
        id: `tag-${tag}`,
        label: `标签: ${tag}`,
        onRemove: () => handleTagChange(tag)
      });
    });

    // 返点范围
    if (rebateMin || rebateMax) {
      let label = '返点: ';
      if (rebateMin && rebateMax) {
        label += `${rebateMin}% - ${rebateMax}%`;
      } else if (rebateMin) {
        label += `≥ ${rebateMin}%`;
      } else if (rebateMax) {
        label += `≤ ${rebateMax}%`;
      }
      tags.push({
        id: 'rebate',
        label,
        onRemove: () => {
          setRebateMin('');
          setRebateMax('');
          setCurrentPage(1);
        }
      });
    }

    // 价格范围
    if (priceMin || priceMax) {
      let label = '价格: ';
      if (priceMin && priceMax) {
        label += `¥${priceMin} - ¥${priceMax}`;
      } else if (priceMin) {
        label += `≥ ¥${priceMin}`;
      } else if (priceMax) {
        label += `≤ ¥${priceMax}`;
      }
      tags.push({
        id: 'price',
        label,
        onRemove: () => {
          setPriceMin('');
          setPriceMax('');
          setCurrentPage(1);
        }
      });
    }

    return tags;
  }, [searchTerm, selectedTiers, selectedTags, rebateMin, rebateMax, priceMin, priceMax]);

  // ProTable 列配置（移除价格列头的选择器）
  const columns: ProColumns<Talent>[] = useMemo(() => [
    {
      title: '达人名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,  // 压缩20px
      fixed: 'left',
      ellipsis: true,
      render: (_, record) => {
        const link = getPlatformLink(record);
        return link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-800 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {record.name}
          </a>
        ) : (
          <span className="font-medium text-gray-900">{record.name}</span>
        );
      },
    },
    {
      title: '商业属性',
      dataIndex: 'agencyId',
      key: 'agencyId',
      width: 100,  // 压缩20px
      render: (_, record) => (
        <Tag>{getAgencyName(record.agencyId)}</Tag>
      ),
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
        const tierConfig = getTalentTiers(selectedPlatform).find(
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
      width: 160,  // 压缩20px
      render: (_, record) =>
        record.talentType && record.talentType.length > 0 ? (
          <Space size="small" wrap>
            {record.talentType.slice(0, 2).map((tag, index) => (
              <Tag
                key={index}
                style={{ backgroundColor: stringToColor(tag), color: '#374151' }}
              >
                {tag}
              </Tag>
            ))}
            {record.talentType.length > 2 && (
              <span className="text-xs text-gray-500">+{record.talentType.length - 2}</span>
            )}
          </Space>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
    // 价格列（根据选中的价格类型显示，如果是 null 则隐藏）
    ...(selectedPriceTier ? [{
      title: '当月价格',
      key: 'price',
      width: 100,  // 压缩20px
      render: (_: any, record: Talent) => {
        const latestPrices = getLatestPricesMap(record.prices);
        const price = latestPrices[selectedPriceTier as PriceType];
        return price ? (
          <span className="text-gray-900 font-medium">{formatPrice(price)}</span>
        ) : (
          <span className="text-gray-400">N/A</span>
        );
      },
    }] : []),
    {
      title: '返点',
      key: 'rebate',
      width: 80,  // 压缩20px
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
            record.status === 'active' ? 'success' :
              record.status === 'inactive' ? 'warning' :
                'default'
          }
        >
          {record.status === 'active' ? '活跃' :
            record.status === 'inactive' ? '暂停' :
              '归档'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,  // 增加80px
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleMenuClick('edit', record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => handleMenuClick('price', record)}
            className="text-primary-600 hover:text-primary-700"
          >
            价格
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PercentageOutlined />}
            onClick={() => handleMenuClick('rebate', record)}
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
              onClick: ({ key }) => handleMenuClick(key, record),
            }}
            trigger={['click']}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ], [selectedPlatform, selectedPriceTier, agencies]);

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">基础信息</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理多平台达人信息、价格和返点
          </p>
        </div>

        {/* 平台 Tabs */}
        <Tabs
          activeKey={selectedPlatform}
          onChange={(key) => setSelectedPlatform(key as Platform)}
          items={platforms.map(platform => ({
            key: platform,
            label: PLATFORM_NAMES[platform],
          }))}
        />

        {/* 筛选面板 - 左右两栏布局（参考 Performance） */}
        <div className="bg-white rounded-lg shadow mb-4">
          {/* 筛选面板头部 */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-gray-50"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          >
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${isFilterExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-gray-900">筛选条件</span>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  重置
                </button>
              )}
              <button
                onClick={handleSearch}
                className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded"
              >
                搜索
              </button>
            </div>
          </div>

          {/* 筛选内容区域 - 左右双列布局 */}
          {isFilterExpanded && (
            <div className="flex">
              {/* 左侧：筛选器面板 */}
              <div className="flex-1 p-4 border-r border-gray-100">
                <div className="space-y-4">
                  {/* 搜索框 - 全宽 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      搜索
                    </label>
                    <Input
                      placeholder="按达人名称或OneID搜索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      prefix={<SearchOutlined />}
                      allowClear
                      onPressEnter={handleSearch}
                    />
                  </div>

                  {/* 常用筛选区 - 价格和返点并排 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 价格范围筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        价格范围 <span className="text-xs text-gray-500">（常用）</span>
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="最小"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          style={{ width: '50%' }}
                        />
                        <span className="self-center text-gray-400">-</span>
                        <Input
                          type="number"
                          placeholder="最大"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>

                    {/* 返点范围筛选 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        返点范围 (%) <span className="text-xs text-gray-500">（常用）</span>
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="最小"
                          value={rebateMin}
                          onChange={(e) => setRebateMin(e.target.value)}
                          style={{ width: '50%' }}
                        />
                        <span className="self-center text-gray-400">-</span>
                        <Input
                          type="number"
                          placeholder="最大"
                          value={rebateMax}
                          onChange={(e) => setRebateMax(e.target.value)}
                          style={{ width: '50%' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 其他筛选区 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 达人层级筛选 */}
                    {getUniqueTalentTiers().length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          达人层级
                        </label>
                        <div className="border border-gray-200 rounded-md bg-gray-50" style={{ height: '144px' }}>
                          <div className="p-3 h-full overflow-y-auto">
                            <div className="space-y-2">
                              {getUniqueTalentTiers().map(tier => (
                                <Checkbox
                                  key={tier}
                                  checked={selectedTiers.includes(tier)}
                                  onChange={() => handleTierChange(tier)}
                                >
                                  {tier}
                                </Checkbox>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 内容标签筛选 - 优化展示 */}
                    {getUniqueTalentTypes().length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          内容标签
                        </label>
                        <div className="border border-gray-200 rounded-md bg-gray-50" style={{ width: '400px', height: '144px' }}>
                          {/* 标签列表 - 横向排列带换行 */}
                          <div className="p-3 h-full">
                            <div className="flex flex-wrap gap-2 h-full overflow-y-auto">
                              {getUniqueTalentTypes().map(tag => (
                                <label
                                  key={tag}
                                  className="inline-flex items-center cursor-pointer hover:bg-white rounded px-1 py-0.5 h-fit"
                                >
                                  <Checkbox
                                    checked={selectedTags.includes(tag)}
                                    onChange={() => handleTagChange(tag)}
                                    className="mr-1"
                                  />
                                  <span className="text-sm" title={tag}>
                                    {tag}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 右侧：已选条件展示 */}
              <div className="w-96 p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">已选条件</span>
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      清空全部
                    </button>
                  )}
                </div>

                {activeFilterTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeFilterTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-sm"
                      >
                        <span className="text-gray-700">{tag.label}</span>
                        <button
                          onClick={tag.onRemove}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          <CloseOutlined className="text-xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    暂无筛选条件，请在左侧选择
                  </div>
                )}

                {/* 筛选统计信息 */}
                {hasActiveFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      <div>符合条件的达人: {totalTalents} 个</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ProTable - 达人列表 */}
        {(configLoading || loading) && talents.length === 0 ? (
          <TableSkeleton columnCount={8} rowCount={10} />
        ) : (
          <ProTable<Talent>
            columns={columns}
            actionRef={actionRef}
            dataSource={talents}
            rowKey="oneId"
            loading={configLoading || loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalTalents,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个达人`,
              onChange: (page) => setCurrentPage(page),
            }}
            search={false}
            cardBordered
            headerTitle={
              <div className="flex items-center gap-3">
                <span className="font-medium">达人列表</span>
                <div className="h-4 w-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">共 {totalTalents} 个达人</span>
              </div>
            }
            toolbar={{
              actions: [
                // 新增达人按钮
                <Button
                  key="add"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/talents/create')}
                >
                  新增达人
                </Button>,
                // 批量新增按钮
                <Button
                  key="batch-add"
                  icon={<UploadOutlined />}
                  onClick={() => setBatchCreateModalOpen(true)}
                >
                  批量新增
                </Button>,
                // 价格类型选择器
                <div key="price" className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200">
                  <span className="text-sm font-medium text-primary-700">价格类型</span>
                  <Select
                    value={selectedPriceTier ?? '__HIDE__'}
                    onChange={(val) => setSelectedPriceTier(val === '__HIDE__' ? null : val)}
                    style={{ width: 130 }}
                    size="small"
                    options={[
                      ...priceTypes.map(pt => ({
                        label: pt.label,
                        value: pt.key,
                      })),
                      {
                        label: '隐藏价格',
                        value: '__HIDE__',
                      },
                    ]}
                  />
                </div>,
                // 刷新按钮
                <Button
                  key="refresh"
                  icon={<ReloadOutlined />}
                  onClick={async () => {
                    await loadTalents();
                    message.success('数据已刷新');
                  }}
                >
                  刷新
                </Button>,
              ],
            }}
            options={{
              reload: false,
              density: false,
              setting: true,
            }}
            scroll={{ x: 1500 }}
            size="middle"
          />
        )}

        {/* 价格管理弹窗 */}
        {
          selectedTalent && (
            <PriceModal
              isOpen={priceModalOpen}
              onClose={handleClosePriceModal}
              talent={selectedTalent}
              onSave={handleSavePrices}
            />
          )
        }

        {/* 编辑达人弹窗 */}
        {
          selectedTalent && (
            <EditTalentModal
              isOpen={editModalOpen}
              onClose={handleCloseEditModal}
              talent={selectedTalent}
              onSave={async (oneId: string, platform: Platform, data: Partial<Talent>) => {
                await handleSaveTalent({ ...data, oneId, platform });
              }}
              availableTags={getUniqueTalentTypes()}
            />
          )
        }

        {/* 删除确认弹窗 */}
        {
          selectedTalent && (
            <DeleteConfirmModal
              isOpen={deleteModalOpen}
              onClose={handleCloseDeleteModal}
              talent={selectedTalent}
              onConfirm={handleConfirmDelete}
            />
          )
        }

        {/* 返点管理弹窗 */}
        {
          selectedTalent && (
            <RebateManagementModal
              isOpen={rebateModalOpen}
              onClose={handleCloseRebateModal}
              talent={selectedTalent}
            />
          )
        }

        {/* 批量新增达人弹窗 */}
        <BatchCreateTalentModal
          open={batchCreateModalOpen}
          onClose={() => setBatchCreateModalOpen(false)}
          onSuccess={loadTalents}
          initialPlatform={selectedPlatform}
        />
      </div>
    </PageTransition>
  );
}