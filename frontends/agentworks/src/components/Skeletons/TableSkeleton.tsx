import { Skeleton } from 'antd';

interface TableSkeletonProps {
    rowCount?: number;
    columnCount?: number;
    active?: boolean;
}

export function TableSkeleton({ rowCount = 5, columnCount = 5, active = true }: TableSkeletonProps) {
    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4 mb-6 px-4 border-b border-gray-100 pb-4">
                {Array.from({ length: columnCount }).map((_, index) => (
                    <div key={`header-${index}`} className="flex-1">
                        <Skeleton.Input active={active} size="small" style={{ width: '60%', height: 20 }} />
                    </div>
                ))}
            </div>

            {/* Rows Skeleton */}
            <div className="space-y-6 px-4">
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex items-center gap-4">
                        {Array.from({ length: columnCount }).map((_, colIndex) => (
                            <div key={`cell-${rowIndex}-${colIndex}`} className="flex-1">
                                <Skeleton.Input
                                    active={active}
                                    size="small"
                                    style={{
                                        width: colIndex === 0 ? '80%' : '50%',
                                        height: 16
                                    }}
                                    block
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
