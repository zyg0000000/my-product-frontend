/**
 * 通用分页组件
 * 支持多种样式和大小
 */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean; // 是否显示信息文字
  size?: 'sm' | 'md' | 'lg'; // 按钮大小
}

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  className = '',
  showInfo = true,
  size = 'md',
}: PaginationProps) {
  // 计算显示的页码范围
  const getPageNumbers = (): (number | string)[] => {
    const delta = 2; // 当前页前后显示的页码数量
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    range.forEach(i => {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  // 按钮大小样式
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const buttonClass = sizeStyles[size];

  // 如果只有一页，可以选择不显示分页
  if (totalPages <= 1 && !showInfo) {
    return null;
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = getPageNumbers();

  // 计算显示范围
  const startRecord =
    totalRecords && pageSize ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord =
    totalRecords && pageSize
      ? Math.min(currentPage * pageSize, totalRecords)
      : 0;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 左侧信息 */}
      {showInfo && totalRecords && (
        <div className="text-sm text-content-secondary">
          {totalRecords > 0 ? (
            <>
              显示第{' '}
              <span className="font-medium">
                {startRecord}-{endRecord}
              </span>{' '}
              条， 共 <span className="font-medium">{totalRecords}</span> 条记录
            </>
          ) : (
            '暂无数据'
          )}
        </div>
      )}

      {/* 右侧分页按钮 */}
      <div className="flex items-center gap-1">
        {/* 上一页按钮 */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`
            ${buttonClass} font-medium rounded-md border transition-colors
            ${
              currentPage === 1
                ? 'bg-surface-sunken text-content-muted border-stroke cursor-not-allowed'
                : 'bg-surface text-content border-stroke-hover hover:bg-surface-subtle'
            }
          `}
        >
          上一页
        </button>

        {/* 页码按钮 */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {pageNumbers.map((number, index) =>
              number === '...' ? (
                <span key={`dots-${index}`} className="px-2 text-content-secondary">
                  ...
                </span>
              ) : (
                <button
                  key={number}
                  onClick={() => onPageChange(number as number)}
                  className={`
                    ${buttonClass} min-w-[32px] font-medium rounded-md border transition-colors
                    ${
                      currentPage === number
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-surface text-content border-stroke-hover hover:bg-surface-subtle'
                    }
                  `}
                >
                  {number}
                </button>
              )
            )}
          </div>
        )}

        {/* 下一页按钮 */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`
            ${buttonClass} font-medium rounded-md border transition-colors
            ${
              currentPage === totalPages
                ? 'bg-surface-sunken text-content-muted border-stroke cursor-not-allowed'
                : 'bg-surface text-content border-stroke-hover hover:bg-surface-subtle'
            }
          `}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
