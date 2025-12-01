/**
 * 价格策略 Tab 容器组件
 * 整合各业务策略卡片
 */

import { Card, Tag, Empty } from 'antd';
import { ThunderboltOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { Customer } from '../../../types/customer';
import type { Platform } from '../../../types/talent';
import { TalentProcurementCard } from './TalentProcurementCard';

interface PricingTabProps {
  customer: Customer;
  platform: Platform;
  onUpdate: () => void;
}

export function PricingTab({ customer, platform, onUpdate }: PricingTabProps) {
  return (
    <div className="space-y-4">
      {/* 达人采买策略 */}
      <TalentProcurementCard
        customer={customer}
        platform={platform}
        onUpdate={onUpdate}
      />

      {/* 广告投流策略（开发中） */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ThunderboltOutlined className="text-orange-500" />
            <span>广告投流策略</span>
            <Tag color="default">开发中</Tag>
          </div>
        }
        className="mb-4"
      >
        <Empty
          description="广告投流策略配置功能开发中"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="py-4"
        />
      </Card>

      {/* 内容制作策略（开发中） */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <VideoCameraOutlined className="text-purple-500" />
            <span>内容制作策略</span>
            <Tag color="default">开发中</Tag>
          </div>
        }
        className="mb-4"
      >
        <Empty
          description="内容制作策略配置功能开发中"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="py-4"
        />
      </Card>
    </div>
  );
}

export default PricingTab;
