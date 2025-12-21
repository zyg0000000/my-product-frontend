/**
 * 版本选择器组件
 */

import { Select, Tag, Tooltip } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { CompanyRebateVersion } from '../types';

interface VersionSelectorProps {
  versions: CompanyRebateVersion[];
  selectedId: string | null;
  loading?: boolean;
  onChange: (id: string | null) => void;
}

export function VersionSelector({
  versions,
  selectedId,
  loading,
  onChange,
}: VersionSelectorProps) {
  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 格式化数量
  const formatCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    return count.toLocaleString();
  };

  return (
    <Select
      value={selectedId}
      onChange={onChange}
      loading={loading}
      placeholder="选择版本"
      style={{ width: 280 }}
      allowClear
    >
      {versions.map(version => (
        <Select.Option key={version.importId} value={version.importId}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {version.isDefault ? (
                <Tooltip title="默认版本">
                  <CheckCircleOutlined className="text-green-500 flex-shrink-0" />
                </Tooltip>
              ) : (
                <ClockCircleOutlined className="text-content-muted flex-shrink-0" />
              )}
              <span className="truncate">{version.fileName}</span>
              {version.isDefault && (
                <Tag color="green" className="flex-shrink-0 text-xs">
                  默认
                </Tag>
              )}
            </div>
            <span className="text-content-muted text-xs flex-shrink-0">
              {formatCount(version.recordCount)}条 · {formatDate(version.importedAt)}
            </span>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
}
