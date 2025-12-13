/**
 * 平台信息单元格组件 - v3.0
 * 用于表格行内展示机构在各平台的返点和达人数
 *
 * 设计理念：
 * - 单行紧凑布局，避免拥挤感
 * - 简洁的平台切换器，无浮夸图标
 * - 数据直接展示，清晰易读
 */

import { useState, useEffect } from 'react';
import { Segmented } from 'antd';
import type { Agency } from '../../types/agency';
import type { Platform } from '../../types/talent';
import { usePlatformConfig } from '../../hooks/usePlatformConfig';

interface PlatformInfoCellProps {
  agency: Agency;
  talentCounts: Record<Platform, number>;
}

export function PlatformInfoCell({
  agency,
  talentCounts,
}: PlatformInfoCellProps) {
  const { getPlatformList, getPlatformNames } = usePlatformConfig(false);
  const platforms = getPlatformList();
  const platformNames = getPlatformNames();

  const [activePlatform, setActivePlatform] = useState<Platform>(
    platforms[0] || 'douyin'
  );

  // 当平台列表变化时，确保 activePlatform 有效
  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(activePlatform)) {
      setActivePlatform(platforms[0]);
    }
  }, [platforms, activePlatform]);

  // 获取当前平台的返点率
  const rebate = agency.rebateConfig?.platforms?.[activePlatform]?.baseRebate;

  // 获取当前平台的达人数
  const count = talentCounts?.[activePlatform] || 0;

  // 平台选项 - 简短名称
  const platformOptions = platforms.map((p) => ({
    label: platformNames[p] || p,
    value: p,
  }));

  return (
    <div className="flex items-center gap-4">
      {/* 平台切换器 */}
      <Segmented
        size="small"
        options={platformOptions}
        value={activePlatform}
        onChange={(v) => setActivePlatform(v as Platform)}
      />

      {/* 返点 */}
      <div className="flex items-center gap-1 text-sm whitespace-nowrap">
        <span className="text-content-muted">返点</span>
        {rebate !== undefined && rebate !== null ? (
          <span className="font-medium text-success-600 dark:text-success-400 tabular-nums">
            {rebate}%
          </span>
        ) : (
          <span className="text-content-muted">-</span>
        )}
      </div>

      {/* 达人数 */}
      <div className="flex items-center gap-1 text-sm whitespace-nowrap">
        <span className="text-content-muted">达人</span>
        <span
          className={`font-medium tabular-nums ${
            count > 0 ? 'text-content' : 'text-content-muted'
          }`}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

export default PlatformInfoCell;
