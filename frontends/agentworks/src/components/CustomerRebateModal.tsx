/**
 * 客户返点设置弹窗 (v1.0)
 *
 * 用于设置客户对特定达人的专属返点
 * 支持：
 * - 显示达人默认返点（达人/机构）
 * - 设置客户专属返点
 * - 查看返点历史
 */

import { useState, useEffect } from 'react';
import { Modal, Tabs, Alert, Switch, Table, Spin, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { Platform } from '../types/talent';
import type { RebateConfig } from '../types/rebate';
import {
  getCustomerRebate,
  updateCustomerRebate,
} from '../api/customerTalents';
import {
  REBATE_VALIDATION,
  formatRebateRate,
  REBATE_SOURCE_LABELS,
} from '../types/rebate';
import { usePlatformConfig } from '../hooks/usePlatformConfig';
import { logger } from '../utils/logger';

interface CustomerRebateModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  talent: {
    oneId: string;
    platform: Platform;
    name: string;
  };
  onSuccess?: () => void;
}

type TabType = 'current' | 'settings' | 'history';

export function CustomerRebateModal({
  visible,
  onClose,
  customerId,
  customerName,
  talent,
  onSuccess,
}: CustomerRebateModalProps) {
  const { getPlatformNames } = usePlatformConfig(false);
  const platformNames = getPlatformNames();

  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 数据状态
  const [customerRebate, setCustomerRebate] = useState<{
    enabled: boolean;
    rate: number | null;
    effectiveDate: string | null;
    lastUpdatedAt: string;
    updatedBy: string;
    notes?: string;
  } | null>(null);
  const [talentRebate, setTalentRebate] = useState<{
    rate: number | null;
    source: string;
    agencyName?: string;
  } | null>(null);
  const [effectiveRebate, setEffectiveRebate] = useState<{
    rate: number;
    source: string;
  } | null>(null);
  const [history, setHistory] = useState<RebateConfig[]>([]);

  // 表单状态
  const [enabled, setEnabled] = useState(false);
  const [rebateRate, setRebateRate] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getCustomerRebate(
        customerId,
        talent.oneId,
        talent.platform
      );

      if (response.success && response.data) {
        setCustomerRebate(response.data.customerRebate);
        setTalentRebate(response.data.talentRebate);
        setEffectiveRebate(response.data.effectiveRebate);
        setHistory(response.data.history || []);

        // 初始化表单
        if (response.data.customerRebate) {
          setEnabled(response.data.customerRebate.enabled);
          setRebateRate(response.data.customerRebate.rate ?? undefined);
          setNotes(response.data.customerRebate.notes || '');
        } else {
          setEnabled(false);
          setRebateRate(undefined);
          setNotes('');
        }
      }
    } catch (error) {
      logger.error('加载返点数据失败:', error);
      message.error('加载返点数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 弹窗打开时加载数据
  useEffect(() => {
    if (visible) {
      loadData();
      setActiveTab('current');
    }
  }, [visible, customerId, talent.oneId, talent.platform]);

  // 保存设置
  const handleSave = async () => {
    if (enabled && (rebateRate === undefined || rebateRate === null)) {
      message.error('请输入返点率');
      return;
    }

    if (
      enabled &&
      rebateRate !== undefined &&
      (rebateRate < REBATE_VALIDATION.min || rebateRate > REBATE_VALIDATION.max)
    ) {
      message.error(
        `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
      );
      return;
    }

    try {
      setSaving(true);
      const response = await updateCustomerRebate({
        customerId,
        talentOneId: talent.oneId,
        platform: talent.platform,
        enabled,
        rate: enabled ? rebateRate : undefined,
        notes: notes || undefined,
        updatedBy: 'system',
      });

      if (response.success) {
        message.success(enabled ? '客户返点已设置' : '已关闭客户专属返点');
        await loadData();
        onSuccess?.();
        setActiveTab('current');
      } else {
        message.error(response.message || '保存失败');
      }
    } catch (error) {
      logger.error('保存返点失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 获取返点来源标签
  const getSourceLabel = (source: string) => {
    return (
      REBATE_SOURCE_LABELS[source as keyof typeof REBATE_SOURCE_LABELS] ||
      source
    );
  };

  // 历史记录表格列
  const historyColumns = [
    {
      title: '调整前',
      dataIndex: 'previousRate',
      key: 'previousRate',
      width: 80,
      render: (rate: number | undefined) =>
        rate !== undefined ? formatRebateRate(rate) : '-',
    },
    {
      title: '调整后',
      dataIndex: 'rebateRate',
      key: 'rebateRate',
      width: 80,
      render: (rate: number) => (
        <span className="font-semibold text-success-600 dark:text-success-400">
          {formatRebateRate(rate)}
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 80,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  const tabItems = [
    {
      key: 'current',
      label: '当前返点',
      children: (
        <ProCard>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 生效返点 */}
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div className="text-xs text-content-secondary mb-1">
                  当前生效返点
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {effectiveRebate
                      ? formatRebateRate(effectiveRebate.rate)
                      : '-'}
                  </span>
                  {effectiveRebate && (
                    <span className="text-sm text-content-secondary">
                      来源：{getSourceLabel(effectiveRebate.source)}
                    </span>
                  )}
                </div>
              </div>

              {/* 返点详情 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="text-xs text-content-secondary mb-1">
                    达人/机构返点
                  </div>
                  <div className="text-base font-medium text-content">
                    {talentRebate?.rate !== null &&
                    talentRebate?.rate !== undefined
                      ? formatRebateRate(talentRebate.rate)
                      : '-'}
                  </div>
                  {talentRebate && (
                    <div className="text-xs text-content-muted mt-1">
                      {getSourceLabel(talentRebate.source)}
                      {talentRebate.agencyName &&
                      talentRebate.source === 'agency'
                        ? ` (${talentRebate.agencyName})`
                        : ''}
                    </div>
                  )}
                </div>
                <div className="p-3 bg-surface-base rounded-lg">
                  <div className="text-xs text-content-secondary mb-1">
                    客户专属返点
                  </div>
                  <div className="text-base font-medium text-content">
                    {customerRebate?.enabled &&
                    customerRebate?.rate !== null ? (
                      formatRebateRate(customerRebate.rate)
                    ) : (
                      <span className="text-content-muted">未设置</span>
                    )}
                  </div>
                  {customerRebate?.enabled && (
                    <div className="text-xs text-content-muted mt-1">
                      生效日期：{customerRebate.effectiveDate || '-'}
                    </div>
                  )}
                </div>
              </div>

              {/* 说明 */}
              <Alert
                message="返点优先级说明"
                description="客户专属返点 > 达人独立返点 > 机构统一返点 > 系统默认返点。创建合作时将自动使用生效返点。"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />
            </div>
          )}
        </ProCard>
      ),
    },
    {
      key: 'settings',
      label: '设置返点',
      children: (
        <ProCard>
          <ProForm
            onFinish={handleSave}
            submitter={{
              render: (_, dom) => (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  {dom}
                </div>
              ),
              submitButtonProps: {
                loading: saving,
                children: '保存',
              },
            }}
            layout="vertical"
          >
            {/* 启用开关 */}
            <div className="mb-4 p-4 bg-surface-base rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-content">
                    启用客户专属返点
                  </div>
                  <div className="text-xs text-content-secondary mt-1">
                    开启后，该客户与此达人的合作将使用专属返点率
                  </div>
                </div>
                <Switch checked={enabled} onChange={setEnabled} />
              </div>
            </div>

            {enabled && (
              <>
                <ProFormDigit
                  label="返点率"
                  name="rebateRate"
                  fieldProps={{
                    value: rebateRate,
                    onChange: value => setRebateRate(value ?? undefined),
                    precision: 2,
                    min: REBATE_VALIDATION.min,
                    max: REBATE_VALIDATION.max,
                    suffix: '%',
                    placeholder: '请输入返点率',
                  }}
                  rules={[
                    { required: true, message: '请输入返点率' },
                    {
                      validator: (_: unknown, value: number) => {
                        if (
                          value < REBATE_VALIDATION.min ||
                          value > REBATE_VALIDATION.max
                        ) {
                          return Promise.reject(
                            `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                  extra={
                    talentRebate?.rate !== null &&
                    talentRebate?.rate !== undefined
                      ? `参考：达人默认返点 ${formatRebateRate(talentRebate.rate)}`
                      : undefined
                  }
                />
                <ProFormTextArea
                  label="备注"
                  name="notes"
                  fieldProps={{
                    value: notes,
                    onChange: e => setNotes(e.target.value),
                    placeholder: '如：客户谈判获得的专属返点',
                    maxLength: 200,
                    showCount: true,
                    rows: 2,
                  }}
                />
              </>
            )}

            {!enabled && customerRebate?.enabled && (
              <Alert
                message="关闭客户专属返点后，将使用达人/机构的默认返点率"
                type="warning"
                showIcon
              />
            )}
          </ProForm>
        </ProCard>
      ),
    },
    {
      key: 'history',
      label: `调整历史 (${history.length})`,
      children: (
        <ProCard>
          {loading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : history.length > 0 ? (
            <Table
              dataSource={history}
              columns={historyColumns}
              pagination={false}
              size="small"
              rowKey="configId"
            />
          ) : (
            <Alert
              message="暂无历史记录"
              description="该达人在此客户还没有返点调整记录。"
              type="info"
              showIcon
            />
          )}
        </ProCard>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          <div className="text-base font-semibold">
            客户返点设置 - {talent.name}
          </div>
          <div className="text-xs font-normal text-content-secondary mt-1">
            为「{customerName}」设置该达人的专属返点 (
            {platformNames[talent.platform] || talent.platform})
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnHidden
      centered
    >
      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as TabType)}
        items={tabItems}
      />
    </Modal>
  );
}
