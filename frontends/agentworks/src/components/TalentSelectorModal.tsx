/**
 * 达人选择器弹窗
 *
 * 用于从达人列表中选择达人添加到客户达人池
 * 功能：
 * - 搜索达人（按名称）
 * - 多选达人
 * - 已在池中的达人显示"已添加"标记
 * - 批量添加到客户池
 */

import { useState, useEffect } from 'react';
import { Modal, Input, Table, Button, Tag, Space, Spin, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { searchTalents } from '../api/talent';
import { addCustomerTalents, getCustomerTalents } from '../api/customerTalents';
import type { Platform } from '../types/talent';
import { usePlatformConfig } from '../hooks/usePlatformConfig';
import { logger } from '../utils/logger';

interface TalentItem {
  oneId: string;
  name: string;
  platform: Platform;
  isAdded?: boolean;
}

interface TalentSelectorModalProps {
  visible: boolean;
  customerId: string;
  platform: Platform;
  onClose: () => void;
  onSuccess: () => void;
}

export function TalentSelectorModal({
  visible,
  customerId,
  platform,
  onClose,
  onSuccess,
}: TalentSelectorModalProps) {
  // 使用 App.useApp() 获取 message 实例（Ant Design 5.x 最佳实践）
  const { message } = App.useApp();

  // 状态
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

  // 平台配置
  const { getPlatformConfigByKey } = usePlatformConfig();
  const platformConfig = getPlatformConfigByKey(platform);
  const platformName = platformConfig?.name || platform;

  // 加载已添加的达人ID
  const loadExistingTalents = async () => {
    try {
      const response = await getCustomerTalents({
        customerId,
        platform,
        pageSize: 9999,
        includeTalentInfo: false,
      });
      const ids = new Set(response.list.map(item => item.talentOneId));
      setExistingIds(ids);
    } catch (error) {
      logger.error('Failed to load existing talents:', error);
    }
  };

  // 搜索达人
  const searchTalentList = async (search: string = '', page: number = 1) => {
    try {
      setLoading(true);
      const response = await searchTalents({
        platform,
        search,
        page,
        pageSize,
      });

      if (response.success && response.data) {
        const talentList = response.data.talents.map((t: any) => ({
          oneId: t.oneId,
          name: t.name,
          platform: t.platform,
          isAdded: existingIds.has(t.oneId),
        }));
        setTalents(talentList);
        setTotal(response.data.pagination?.totalItems || 0);
      }
    } catch (error) {
      logger.error('Failed to search talents:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    if (visible) {
      setSearchValue('');
      setSelectedRowKeys([]);
      setCurrentPage(1);
      loadExistingTalents().then(() => {
        searchTalentList('', 1);
      });
    }
  }, [visible, customerId, platform]);

  // 更新已添加状态
  useEffect(() => {
    setTalents(prev =>
      prev.map(t => ({
        ...t,
        isAdded: existingIds.has(t.oneId),
      }))
    );
  }, [existingIds]);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    searchTalentList(searchValue, 1);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    searchTalentList(searchValue, page);
  };

  // 处理提交
  const handleSubmit = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要添加的达人');
      return;
    }

    try {
      setSubmitting(true);
      const response = await addCustomerTalents({
        customerId,
        platform,
        talents: selectedRowKeys.map(oneId => ({ oneId })),
      });

      if (response.insertedCount > 0 || response.restoredCount > 0) {
        message.success(response.message);
        onSuccess();
        onClose();
      } else if (response.duplicates && response.duplicates.length > 0) {
        message.warning(
          `${response.duplicates.length} 个达人已在池中，无需重复添加`
        );
      }
    } catch (error) {
      message.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 表格列
  const columns: ColumnsType<TalentItem> = [
    {
      title: '达人昵称',
      dataIndex: 'name',
      render: (name, record) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {record.isAdded && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              已添加
            </Tag>
          )}
        </div>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      // 过滤掉已添加的达人
      const filteredKeys = keys.filter(key => {
        const talent = talents.find(t => t.oneId === key);
        return !talent?.isAdded;
      });
      setSelectedRowKeys(filteredKeys as string[]);
    },
    getCheckboxProps: (record: TalentItem) => ({
      disabled: record.isAdded,
    }),
  };

  return (
    <Modal
      title={`添加达人到客户池 (${platformName})`}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={
        <div className="flex justify-between items-center">
          <span className="text-content-muted">
            已选择 {selectedRowKeys.length} 个达人
          </span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              disabled={selectedRowKeys.length === 0}
            >
              确认添加
            </Button>
          </Space>
        </div>
      }
    >
      {/* 搜索框 */}
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="搜索达人昵称..."
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          className="flex-1"
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      {/* 达人列表 */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={talents}
          rowKey="oneId"
          rowSelection={rowSelection}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showTotal: t => `共 ${t} 个达人`,
            onChange: handlePageChange,
            size: 'small',
          }}
          size="small"
          scroll={{ y: 400 }}
        />
      </Spin>
    </Modal>
  );
}

export default TalentSelectorModal;
