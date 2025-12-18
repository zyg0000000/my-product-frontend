/**
 * 定价配置列表组件 (v5.0)
 *
 * 展示某个平台的多个时间段配置
 * 支持新增、编辑、删除操作
 */

import { useState, useMemo } from 'react';
import { Button, Tag, Popconfirm, Empty, Tooltip } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { PlatformConfig as ApiPlatformConfig } from '../../../api/platformConfig';
import {
  type PricingConfigItem,
  type ConfigStatus,
  getConfigStatus,
  getConfigStatusInfo,
  calculateCoefficientFromConfig,
} from './talentProcurement';
import { PricingConfigModal } from './PricingConfigModal';

interface PricingConfigListProps {
  /** 配置列表 */
  configs: PricingConfigItem[];
  /** 配置变更回调（只读模式下可不传） */
  onChange?: (configs: PricingConfigItem[]) => void;
  /** 平台名称（只读模式下可不传） */
  platformName?: string;
  /** 平台配置 */
  platformConfig?: ApiPlatformConfig;
  /** 是否只读模式 */
  readonly?: boolean;
  /** 紧凑模式（减少显示信息） */
  compact?: boolean;
  /** 当前生效的报价系数（只读模式显示） */
  quotationCoefficient?: number;
}

export function PricingConfigList({
  configs,
  onChange,
  platformName = '',
  platformConfig,
  readonly = false,
  compact = false,
  quotationCoefficient,
}: PricingConfigListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PricingConfigItem | undefined>();

  // 按状态排序：当前生效 > 即将生效 > 已过期
  const sortedConfigs = useMemo(() => {
    const statusOrder: Record<ConfigStatus, number> = {
      active: 0,
      permanent: 1,
      upcoming: 2,
      expired: 3,
    };

    return [...configs].sort((a, b) => {
      const statusA = getConfigStatus(a);
      const statusB = getConfigStatus(b);
      return statusOrder[statusA] - statusOrder[statusB];
    });
  }, [configs]);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingConfig(undefined);
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (config: PricingConfigItem) => {
    setEditingConfig(config);
    setModalOpen(true);
  };

  // 删除配置
  const handleDelete = (configId: string) => {
    const newConfigs = configs.filter(c => c.id !== configId);
    onChange?.(newConfigs);
  };

  // 保存配置
  const handleSave = (config: PricingConfigItem) => {
    if (editingConfig) {
      // 编辑：替换原配置
      const newConfigs = configs.map(c => (c.id === config.id ? config : c));
      onChange?.(newConfigs);
    } else {
      // 新增：追加到列表
      onChange?.([...configs, config]);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: ConfigStatus) => {
    switch (status) {
      case 'active':
      case 'permanent':
        return <CheckCircleOutlined className="text-success-500" />;
      case 'upcoming':
        return <ClockCircleOutlined className="text-primary-500" />;
      case 'expired':
        return <MinusCircleOutlined className="text-content-muted" />;
      default:
        return null;
    }
  };

  // 渲染单个配置卡片
  const renderConfigCard = (config: PricingConfigItem) => {
    const status = getConfigStatus(config);
    const statusInfo = getConfigStatusInfo(status);
    const coefficient = calculateCoefficientFromConfig(config);
    const isExpired = status === 'expired';

    return (
      <div
        key={config.id}
        className={`p-4 border rounded-lg ${
          isExpired
            ? 'border-stroke bg-surface-base opacity-60'
            : status === 'active' || status === 'permanent'
            ? 'border-success-300 bg-success-50'
            : 'border-primary-300 bg-primary-50'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <Tag color={statusInfo.tagColor}>{statusInfo.label}</Tag>
            <span className="text-sm text-content-secondary">
              {config.isPermanent
                ? '长期有效'
                : `${config.validFrom} ~ ${config.validTo}`}
            </span>
          </div>
          {!readonly && (
            <div className="flex items-center gap-2">
              <Tooltip title="编辑">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(config)}
                />
              </Tooltip>
              <Popconfirm
                title="确定删除此配置？"
                description={
                  isExpired
                    ? '删除已过期的配置不会影响历史项目'
                    : '删除后，使用此配置的项目将受到影响'
                }
                onConfirm={() => handleDelete(config.id)}
                okText="确定"
                cancelText="取消"
              >
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-content-secondary">折扣率</span>
            <div className="font-medium">{(config.discountRate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <span className="text-content-secondary">服务费率</span>
            <div className="font-medium">{(config.serviceFeeRate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <span className="text-content-secondary">平台费</span>
            <div className="font-medium">{(config.platformFeeRate * 100).toFixed(0)}%</div>
          </div>
          <div>
            <span className="text-content-secondary">报价系数</span>
            <div className="font-semibold text-primary-600">
              {coefficient.coefficient.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-content-muted">
          {config.includesPlatformFee ? '折扣含平台费' : '折扣不含平台费'} |{' '}
          {config.serviceFeeBase === 'beforeDiscount'
            ? '服务费按折扣前计算'
            : '服务费按折扣后计算'}{' '}
          | {config.includesTax ? '含税报价' : '不含税报价'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 配置列表 */}
      {sortedConfigs.length > 0 ? (
        sortedConfigs.map(renderConfigCard)
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无定价配置"
          className="py-6"
        />
      )}

      {/* 新增按钮 */}
      {!readonly && (
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={handleAdd}
          className="mt-2"
        >
          新增定价配置
        </Button>
      )}

      {/* 编辑弹窗 */}
      <PricingConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingConfig={editingConfig}
        existingConfigs={configs}
        platformName={platformName}
        platformConfig={platformConfig}
      />
    </div>
  );
}

export default PricingConfigList;
