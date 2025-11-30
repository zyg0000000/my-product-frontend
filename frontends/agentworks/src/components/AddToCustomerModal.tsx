/**
 * 添加到客户池弹窗
 *
 * 功能：
 * - 搜索选择目标客户
 * - 将选中的达人批量添加到客户的达人池
 * - 显示添加结果（成功数、重复数）
 */

import { useState, useEffect } from 'react';
import { Modal, Select, Alert, Space, Tag, App } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import { customerApi } from '../services/customerApi';
import { addCustomerTalents } from '../api/customerTalents';
import type { Customer } from '../types/customer';
import type { Platform } from '../types/talent';
import { CUSTOMER_LEVEL_NAMES } from '../types/customer';

interface AddToCustomerModalProps {
  visible: boolean;
  platform: Platform;
  selectedTalents: Array<{ oneId: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToCustomerModal({
  visible,
  platform,
  selectedTalents,
  onClose,
  onSuccess,
}: AddToCustomerModalProps) {
  // 使用 App.useApp() 获取 message 实例（Ant Design 5.x 最佳实践）
  const { message } = App.useApp();

  // 状态
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // 加载客户列表
  const loadCustomers = async (search: string = '') => {
    try {
      setLoading(true);
      const response = await customerApi.getCustomers({
        searchTerm: search,
        status: 'active',
        pageSize: 50,
      });

      if (response.success && response.data) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    if (visible) {
      setSelectedCustomerId(null);
      loadCustomers();
    }
  }, [visible]);

  // 搜索客户
  const handleSearch = (value: string) => {
    loadCustomers(value);
  };

  // 提交添加
  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      message.warning('请选择目标客户');
      return;
    }

    try {
      setSubmitting(true);
      const response = await addCustomerTalents({
        customerId: selectedCustomerId,
        platform,
        talents: selectedTalents.map(t => ({ oneId: t.oneId })),
      });

      // 构建结果消息
      const messages: string[] = [];
      if (response.insertedCount > 0) {
        messages.push(`成功添加 ${response.insertedCount} 个达人`);
      }
      if (response.restoredCount > 0) {
        messages.push(`恢复 ${response.restoredCount} 个已移除达人`);
      }
      if (response.duplicates && response.duplicates.length > 0) {
        messages.push(`${response.duplicates.length} 个已在池中`);
      }

      if (response.insertedCount > 0 || response.restoredCount > 0) {
        message.success(messages.join('，'));
        onSuccess();
        onClose();
      } else {
        message.warning(messages.join('，') || '没有新达人被添加');
      }
    } catch (error) {
      message.error('添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 客户选项
  const customerOptions = customers.map(c => ({
    value: c._id || c.code,
    label: (
      <div className="flex items-center justify-between">
        <span className="font-medium">{c.name}</span>
        <Tag color={c.level === 'VIP' ? 'gold' : 'blue'}>
          {CUSTOMER_LEVEL_NAMES[c.level]}
        </Tag>
      </div>
    ),
    // 用于搜索
    searchText: `${c.name} ${c.code}`,
  }));

  // 获取选中客户名称
  const selectedCustomer = customers.find(
    c => (c._id || c.code) === selectedCustomerId
  );

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>添加到客户达人池</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确认添加"
      cancelText="取消"
      confirmLoading={submitting}
      okButtonProps={{ disabled: !selectedCustomerId }}
      width={500}
    >
      {/* 已选达人信息 */}
      <Alert
        type="info"
        showIcon
        icon={<UserOutlined />}
        message={
          <span>
            已选择 <strong>{selectedTalents.length}</strong> 个达人
          </span>
        }
        description={
          selectedTalents.length <= 5 ? (
            <div className="mt-1 text-gray-600">
              {selectedTalents.map(t => t.name).join('、')}
            </div>
          ) : (
            <div className="mt-1 text-gray-600">
              {selectedTalents
                .slice(0, 5)
                .map(t => t.name)
                .join('、')}
              <span className="text-gray-400">
                {' '}
                等 {selectedTalents.length} 人
              </span>
            </div>
          )
        }
        className="mb-4"
      />

      {/* 客户选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择目标客户 <span className="text-red-500">*</span>
        </label>
        <Select
          showSearch
          placeholder="搜索客户名称..."
          value={selectedCustomerId}
          onChange={setSelectedCustomerId}
          onSearch={handleSearch}
          loading={loading}
          filterOption={false}
          options={customerOptions}
          style={{ width: '100%' }}
          size="large"
          notFoundContent={loading ? '加载中...' : '未找到客户'}
        />
      </div>

      {/* 选中客户信息 */}
      {selectedCustomer && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">
                {selectedCustomer.name}
              </div>
              <div className="text-sm text-gray-500">
                编码: {selectedCustomer.code}
              </div>
            </div>
            <Tag color={selectedCustomer.level === 'VIP' ? 'gold' : 'blue'}>
              {CUSTOMER_LEVEL_NAMES[selectedCustomer.level]}
            </Tag>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default AddToCustomerModal;
