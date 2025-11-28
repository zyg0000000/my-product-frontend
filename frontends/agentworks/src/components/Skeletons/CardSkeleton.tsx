import { Skeleton } from 'antd';

interface CardSkeletonProps {
  active?: boolean;
  className?: string;
  height?: number | string;
}

export function CardSkeleton({
  active = true,
  className = '',
  height = 120,
}: CardSkeletonProps) {
  return (
    <div
      className={`p-4 bg-white rounded-lg border border-gray-200 ${className}`}
      style={{ height }}
    >
      <div className="flex flex-col items-center justify-center space-y-3">
        <Skeleton.Button
          active={active}
          size="large"
          style={{ width: 60, height: 40 }}
        />
        <Skeleton.Input
          active={active}
          size="small"
          style={{ width: 80, height: 16 }}
        />
        <Skeleton.Input
          active={active}
          size="small"
          style={{ width: 100, height: 12 }}
        />
      </div>
    </div>
  );
}

export function StatsGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
