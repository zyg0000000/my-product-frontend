/**
 * 页面骨架屏组件
 * 使用新设计系统
 */

import { Skeleton } from 'antd';

interface PageSkeletonProps {
  /** 是否显示动画 */
  active?: boolean;
  /** 是否显示页头 */
  showHeader?: boolean;
  /** 内容行数 */
  rows?: number;
  /** 布局类型 */
  layout?: 'default' | 'split' | 'cards' | 'table';
}

export function PageSkeleton({
  active = true,
  showHeader = true,
  rows = 6,
  layout = 'default',
}: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页头骨架 */}
      {showHeader && (
        <div className="card">
          <div className="space-y-3">
            <Skeleton.Input
              active={active}
              size="large"
              style={{ width: 200 }}
            />
            <Skeleton.Input
              active={active}
              size="small"
              style={{ width: 300 }}
            />
          </div>
        </div>
      )}

      {/* 内容骨架 - 根据布局类型渲染 */}
      {layout === 'default' && (
        <div className="card">
          <Skeleton active={active} paragraph={{ rows }} />
        </div>
      )}

      {layout === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <Skeleton active={active} paragraph={{ rows }} />
          </div>
          <div className="card">
            <Skeleton active={active} paragraph={{ rows: 4 }} />
          </div>
        </div>
      )}

      {layout === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card">
              <div className="space-y-3">
                <Skeleton.Avatar active={active} size={48} shape="square" />
                <Skeleton.Input active={active} size="small" block />
                <Skeleton.Input
                  active={active}
                  size="small"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {layout === 'table' && (
        <div className="card overflow-hidden">
          {/* 表格工具栏骨架 */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-stroke">
            <div className="flex items-center gap-2">
              <Skeleton.Input
                active={active}
                size="small"
                style={{ width: 200 }}
              />
              <Skeleton.Button active={active} size="small" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton.Button active={active} size="small" />
              <Skeleton.Button active={active} size="small" />
            </div>
          </div>
          {/* 表格骨架 */}
          <div className="space-y-3">
            {/* 表头 */}
            <div className="flex items-center gap-4 py-3 border-b border-stroke bg-surface-base px-4 rounded-t-lg">
              {[120, 160, 120, 100, 80].map((w, i) => (
                <Skeleton.Input
                  key={i}
                  active={active}
                  size="small"
                  style={{ width: w }}
                />
              ))}
            </div>
            {/* 表格行 */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center gap-4 py-3 px-4 border-b border-stroke last:border-b-0"
              >
                {[120, 160, 120, 100, 80].map((w, colIndex) => (
                  <Skeleton.Input
                    key={colIndex}
                    active={active}
                    size="small"
                    style={{ width: w }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 统计卡片骨架屏
 */
export function StatCardSkeleton({ active = true }: { active?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton.Input active={active} size="small" style={{ width: 80 }} />
          <Skeleton.Input active={active} size="large" style={{ width: 120 }} />
        </div>
        <Skeleton.Avatar active={active} size={48} shape="square" />
      </div>
    </div>
  );
}

/**
 * 列表项骨架屏
 */
export function ListItemSkeleton({ active = true }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-stroke last:border-b-0">
      <Skeleton.Avatar active={active} size={40} />
      <div className="flex-1 space-y-2">
        <Skeleton.Input active={active} size="small" style={{ width: '60%' }} />
        <Skeleton.Input active={active} size="small" style={{ width: '40%' }} />
      </div>
      <Skeleton.Button active={active} size="small" />
    </div>
  );
}

export default PageSkeleton;
