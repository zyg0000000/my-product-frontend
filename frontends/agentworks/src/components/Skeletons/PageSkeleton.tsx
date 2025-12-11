import { Skeleton, Space } from 'antd';
import { ProCard } from '@ant-design/pro-components';

interface PageSkeletonProps {
  active?: boolean;
}

export function PageSkeleton({ active = true }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-white p-6 border-b border-gray-200">
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Skeleton.Input
            active={active}
            size="large"
            style={{ width: 200, height: 32 }}
          />
          <Skeleton.Input
            active={active}
            size="small"
            style={{ width: 300, height: 20 }}
          />
        </Space>
      </div>

      {/* Content Skeleton */}
      <div className="px-6">
        <ProCard ghost gutter={[16, 16]}>
          <ProCard
            colSpan={16}
            layout="center"
            className="border border-gray-200"
          >
            <div className="w-full p-4 space-y-4">
              <Skeleton active={active} paragraph={{ rows: 6 }} />
            </div>
          </ProCard>
          <ProCard
            colSpan={8}
            layout="center"
            className="border border-gray-200"
          >
            <div className="w-full p-4 space-y-4">
              <Skeleton active={active} paragraph={{ rows: 4 }} />
            </div>
          </ProCard>
        </ProCard>
      </div>
    </div>
  );
}
