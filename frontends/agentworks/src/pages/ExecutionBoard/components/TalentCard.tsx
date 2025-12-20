/**
 * 执行看板 - 达人卡片组件
 * 优化版：增强 hover/拖拽动效
 */

import { useMemo, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import { DragOutlined } from '@ant-design/icons';
import type { CollaborationWithProject } from '../types';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import {
  getCollabStatusLabel,
  STATUS_COLORS,
  formatShortDate,
  parseLocalDate,
  isCollabDelayed,
} from '../utils';

interface TalentCardProps {
  collaboration: CollaborationWithProject;
  isEditable: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function TalentCard({
  collaboration,
  isEditable,
  onClick,
  onDragStart,
  onDragEnd,
}: TalentCardProps) {
  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );
  const [isDragging, setIsDragging] = useState(false);

  const statusKey = getCollabStatusLabel(collaboration);
  const statusConfig = STATUS_COLORS[statusKey];
  const platformName =
    platformNames[collaboration.talentPlatform] || collaboration.talentPlatform;
  const platformColor = platformColors[collaboration.talentPlatform] || 'blue';

  // 计算延期天数
  const delayDays = useMemo(() => {
    if (!isCollabDelayed(collaboration)) return 0;
    const planned = parseLocalDate(collaboration.plannedReleaseDate!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil(
      (today.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [collaboration]);

  // 达人名称
  const talentName =
    collaboration.talentInfo?.name || collaboration.talentName || '未知达人';

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e);
  };

  // 处理拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd(e);
  };

  // 判断文本是否可能被截断（简单估算）
  const isLongName =
    talentName.length > 6 || collaboration.projectName.length > 8;

  // 悬窗内容：仅在有补充价值时显示
  const tooltipContent = (
    <div className="text-xs p-0.5">
      {/* 仅当名称可能被截断时显示完整信息 */}
      {isLongName && (
        <div className="space-y-0.5 mb-1.5 pb-1.5 border-b border-white/20">
          <div className="font-semibold">{talentName}</div>
          <div className="text-white/70">{collaboration.projectName}</div>
        </div>
      )}
      {/* 操作提示 */}
      <div className="text-white/60 text-[10px]">
        {isEditable ? '点击编辑 · 拖拽改期' : '点击查看详情'}
      </div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top" mouseEnterDelay={0.4}>
      <div
        className={`
          group relative rounded-lg border-l-3 bg-surface px-2.5 py-2 shadow-sm cursor-pointer
          transition-all duration-200 ease-out
          ${collaboration.projectColor.border}
          ${
            isEditable
              ? 'hover:shadow-md hover:-translate-y-0.5 hover:bg-surface-subtle active:translate-y-0 active:shadow-sm'
              : 'opacity-60 cursor-default grayscale-[20%]'
          }
          ${isDragging ? 'rotate-1 scale-105 opacity-80 shadow-lg z-50' : ''}
        `}
        draggable={isEditable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
      >
        {/* 第一行：平台 + 达人名称 + 状态 */}
        <div className="flex items-center gap-1.5">
          <Tag
            color={platformColor}
            className="text-[10px] px-1.5 py-0 leading-4 border-0 rounded font-medium shrink-0"
          >
            {platformName}
          </Tag>
          <span className="text-xs font-semibold text-content truncate flex-1 min-w-0">
            {talentName}
          </span>
          <Tag
            className={`text-[10px] px-1.5 py-0 leading-4 border-0 rounded font-medium shrink-0 ${statusConfig.bg} ${statusConfig.text}`}
          >
            {statusKey === 'delayed' && delayDays > 0
              ? `+${delayDays}天`
              : statusConfig.label}
          </Tag>
        </div>

        {/* 第二行：项目名称 + 日期 */}
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span
            className={`truncate font-medium ${collaboration.projectColor.text} max-w-[60%]`}
          >
            {collaboration.projectName}
          </span>
          {collaboration.plannedReleaseDate && (
            <span className="text-content-muted shrink-0">
              {collaboration.status === '视频已发布' &&
              collaboration.actualReleaseDate ? (
                <span className="text-success-600 font-medium">
                  ✓{' '}
                  {formatShortDate(
                    parseLocalDate(collaboration.actualReleaseDate)
                  )}
                </span>
              ) : (
                formatShortDate(
                  parseLocalDate(collaboration.plannedReleaseDate)
                )
              )}
            </span>
          )}
        </div>

        {/* 拖拽指示器 */}
        {isEditable && (
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity duration-200">
            <DragOutlined className="text-[10px] text-content-muted" />
          </div>
        )}
      </div>
    </Tooltip>
  );
}
