/**
 * 机构达人管理弹窗组件
 *
 * 功能：
 * 1. 显示机构下各平台达人（按平台切换）
 * 2. 支持搜索、分页
 * 3. 多选勾选
 * 4. 批量解绑达人
 *
 * v2.0: 添加平台切换功能
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Modal,
  Table,
  Input,
  Button,
  Checkbox,
  Tag,
  Popconfirm,
  App,
  Empty,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  DisconnectOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getTalents, batchUnbindAgency } from '../../api/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';
import { logger } from '../../utils/logger';
import type { Agency } from '../../types/agency';
import type { Talent, Platform } from '../../types/talent';

const { Search } = Input;

interface AgencyTalentListModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** 目标机构 */
  agency: Agency;
}

/** 扩展的达人数据（包含 UI 状态） */
interface TalentWithUI extends Talent {
  key: string;
  selected: boolean;
}

export function AgencyTalentListModal({
  open,
  onClose,
  onSuccess,
  agency,
}: AgencyTalentListModalProps) {
  const { message } = App.useApp();
  const { getPlatformList, getPlatformNames, getPlatformColors } =
    usePlatformConfig(false);
  const platforms = getPlatformList();
  const platformNames = getPlatformNames();
  const platformColors = getPlatformColors();

  // 平台切换状态
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>(
    'all'
  );

  // 数据状态
  const [talents, setTalents] = useState<TalentWithUI[]>([]);
  const [loading, setLoading] = useState(false);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');

  // 解绑状态
  const [unbinding, setUnbinding] = useState(false);

  // 统计
  const selectedCount = useMemo(
    () => talents.filter((t) => t.selected).length,
    [talents]
  );

  // 加载达人列表（支持平台筛选）
  const loadTalents = useCallback(
    async (pageNum = 1, search = '', platform: Platform | 'all' = 'all') => {
      if (!agency?.id) return;

      setLoading(true);

      try {
        const response = await getTalents({
          agencyId: agency.id,
          page: pageNum,
          limit: pageSize,
          searchTerm: search || undefined,
          // 只在选择具体平台时传入 platform 参数
          ...(platform !== 'all' && { platform }),
        });

        if (response.success && response.data) {
          const talentsWithUI: TalentWithUI[] = response.data.map((t) => ({
            ...t,
            key: `${t.oneId}_${t.platform}`,
            selected: false,
          }));
          setTalents(talentsWithUI);
          setTotal(response.total || 0);
          setPage(pageNum);
        } else {
          message.error(response.message || '获取达人列表失败');
        }
      } catch (error) {
        logger.error('获取达人列表失败:', error);
        message.error('获取达人列表失败');
      } finally {
        setLoading(false);
      }
    },
    [agency?.id, pageSize, message]
  );

  // 初始加载
  useEffect(() => {
    if (open && agency?.id) {
      loadTalents(1, '', selectedPlatform);
      setSearchTerm('');
    }
  }, [open, agency?.id, loadTalents, selectedPlatform]);

  // 搜索处理
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    loadTalents(1, value, selectedPlatform);
  };

  // 平台切换处理
  const handlePlatformChange = (value: string | number) => {
    const platform = value as Platform | 'all';
    setSelectedPlatform(platform);
    setPage(1);
    loadTalents(1, searchTerm, platform);
  };

  // 分页变化
  const handlePageChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    loadTalents(newPage, searchTerm, selectedPlatform);
  };

  // 切换单条选中状态
  const toggleSelection = (key: string) => {
    setTalents((prev) =>
      prev.map((t) => (t.key === key ? { ...t, selected: !t.selected } : t))
    );
  };

  // 全选/取消全选
  const toggleSelectAll = (checked: boolean) => {
    setTalents((prev) => prev.map((t) => ({ ...t, selected: checked })));
  };

  // 执行解绑
  const handleUnbind = async () => {
    const toUnbind = talents.filter((t) => t.selected);
    if (toUnbind.length === 0) {
      message.warning('请先选择要解绑的达人');
      return;
    }

    // 按平台分组解绑
    const platformGroups = new Map<Platform, string[]>();
    toUnbind.forEach((t) => {
      const list = platformGroups.get(t.platform) || [];
      list.push(t.oneId);
      platformGroups.set(t.platform, list);
    });

    setUnbinding(true);

    try {
      let totalUnbound = 0;
      let totalFailed = 0;

      // 依次解绑各平台
      for (const [platform, oneIds] of platformGroups) {
        const response = await batchUnbindAgency(platform, oneIds);
        if (response.success && response.data) {
          totalUnbound += response.data.unbound;
          totalFailed += response.data.failed;
        } else {
          totalFailed += oneIds.length;
        }
      }

      if (totalUnbound > 0) {
        message.success(`成功解绑 ${totalUnbound} 个达人`);
        // 刷新列表
        loadTalents(page, searchTerm);
        onSuccess?.();
      }

      if (totalFailed > 0) {
        message.warning(`${totalFailed} 个达人解绑失败`);
      }
    } catch (error) {
      logger.error('解绑失败:', error);
      message.error('解绑失败，请稍后重试');
    } finally {
      setUnbinding(false);
    }
  };

  // 关闭弹窗
  const handleClose = () => {
    setTalents([]);
    setSearchTerm('');
    setPage(1);
    setSelectedPlatform('all');
    onClose();
  };

  // 渲染平台标签（使用动态配置的颜色）
  const renderPlatformTag = (platform: Platform) => {
    const color = platformColors[platform] || 'default';
    const name = platformNames[platform] || platform;
    return <Tag color={color}>{name}</Tag>;
  };

  // 平台选项（包含"全部"选项）
  const platformOptions = useMemo(
    () => [
      { label: '全部平台', value: 'all' },
      ...platforms.map((p) => ({
        label: platformNames[p] || p,
        value: p,
      })),
    ],
    [platforms, platformNames]
  );

  // 表格列定义
  const columns: ColumnsType<TalentWithUI> = [
    {
      title: (
        <Checkbox
          checked={talents.length > 0 && talents.every((t) => t.selected)}
          indeterminate={
            talents.some((t) => t.selected) && !talents.every((t) => t.selected)
          }
          onChange={(e) => toggleSelectAll(e.target.checked)}
          disabled={talents.length === 0}
        />
      ),
      dataIndex: 'selected',
      key: 'selected',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          onChange={() => toggleSelection(record.key)}
        />
      ),
    },
    {
      title: '达人昵称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform: Platform) => renderPlatformTag(platform),
    },
    {
      title: '平台ID',
      dataIndex: 'platformAccountId',
      key: 'platformAccountId',
      width: 140,
      ellipsis: true,
    },
    {
      title: '返点率',
      key: 'rebate',
      width: 80,
      render: (_, record) => {
        const rate = record.currentRebate?.rate;
        if (rate !== undefined && rate !== null) {
          return `${rate}%`;
        }
        return '-';
      },
    },
  ];

  // 渲染底部
  const renderFooter = () => (
    <div className="flex justify-between items-center">
      <div className="text-sm text-content-secondary">
        已选择 <span className="font-medium text-content">{selectedCount}</span>{' '}
        个达人
      </div>
      <div className="flex gap-2">
        <Button onClick={handleClose}>关闭</Button>
        <Popconfirm
          title="确定解绑选中的达人吗？"
          description={`将解绑 ${selectedCount} 个达人，解绑后将变为野生达人`}
          onConfirm={handleUnbind}
          okText="确定解绑"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          disabled={selectedCount === 0}
        >
          <Button
            type="primary"
            danger
            icon={<DisconnectOutlined />}
            loading={unbinding}
            disabled={selectedCount === 0}
          >
            解绑选中 ({selectedCount})
          </Button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <Modal
      title={`机构达人管理 - ${agency?.name || ''}`}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={renderFooter()}
      destroyOnHidden
    >
      <div className="space-y-4">
        {/* 平台切换 */}
        <Segmented
          options={platformOptions}
          value={selectedPlatform}
          onChange={handlePlatformChange}
          block
        />

        {/* 搜索栏 */}
        <div className="flex items-center justify-between">
          <Search
            placeholder="搜索达人昵称/平台ID..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
          />
          <div className="flex items-center gap-4">
            <span className="text-sm text-content-secondary">
              共 <span className="font-medium text-content">{total}</span> 个达人
            </span>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadTalents(page, searchTerm, selectedPlatform)}
              loading={loading}
            >
              刷新
            </Button>
          </div>
        </div>

        {/* 达人表格 */}
        <Table
          columns={columns}
          dataSource={talents}
          rowKey="key"
          size="small"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ y: 350 }}
          locale={{
            emptyText: (
              <Empty
                description={
                  searchTerm
                    ? '没有找到匹配的达人'
                    : '该机构暂无达人'
                }
              />
            ),
          }}
        />
      </div>
    </Modal>
  );
}

export default AgencyTalentListModal;
