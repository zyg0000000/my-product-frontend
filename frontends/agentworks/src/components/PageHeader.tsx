/**
 * 页面头部通用组件
 * 统一的返回按钮 + 标题 + 描述布局
 */

import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
  backText?: string;
  extra?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  onBack,
  backText = '返回列表',
  extra,
}: PageHeaderProps) {
  return (
    <ProCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
              {backText}
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-content m-0">{title}</h1>
            {description && (
              <p className="text-sm text-content-secondary mt-1">{description}</p>
            )}
          </div>
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </ProCard>
  );
}
