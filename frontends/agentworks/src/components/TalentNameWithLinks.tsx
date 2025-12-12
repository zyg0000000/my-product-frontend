/**
 * 达人名称带外链组件
 *
 * @version 1.0.0
 * @description 显示达人名称及其外链按钮，支持多平台配置
 *
 * 使用场景：
 * - 达人基础信息列表
 * - 近期表现页面
 * - 客户达人池
 * - 项目合作达人列表
 */

/* eslint-disable react-refresh/only-export-components */
// 辅助函数与组件紧密相关，放在同一文件便于维护

import { Tooltip } from 'antd';
import { useTalentLinks, type TalentLike } from '../hooks/useTalentLinks';
import type { Platform, PlatformSpecific } from '../types/talent';

export interface TalentNameWithLinksProps {
  /** 达人名称 */
  name: string;
  /** 平台 */
  platform: Platform;
  /** 平台账号ID */
  platformAccountId?: string;
  /** 平台特定字段 */
  platformSpecific?: PlatformSpecific | Record<string, string>;
  /** 名称点击回调（如跳转到详情页） */
  onNameClick?: () => void;
  /** 是否将名称显示为链接样式 */
  nameAsLink?: boolean;
  /** 自定义名称样式类名 */
  nameClassName?: string;
}

/**
 * 达人名称带外链组件
 */
export function TalentNameWithLinks({
  name,
  platform,
  platformAccountId,
  platformSpecific,
  onNameClick,
  nameAsLink = false,
  nameClassName,
}: TalentNameWithLinksProps) {
  const { getTalentNameLinks } = useTalentLinks();

  // 构建达人数据对象
  const talentData: TalentLike = {
    platform,
    platformAccountId,
    platformSpecific,
  };

  const links = getTalentNameLinks(talentData);

  // 名称样式
  const defaultNameClass = nameAsLink
    ? 'font-medium text-primary-600 hover:text-primary-800 cursor-pointer'
    : 'font-medium text-content';
  const finalNameClass = nameClassName || defaultNameClass;

  return (
    <div className="flex items-center gap-2">
      {onNameClick ? (
        <span className={finalNameClass} onClick={onNameClick}>
          {name}
        </span>
      ) : (
        <span className={finalNameClass}>{name}</span>
      )}
      {links.length > 0 && (
        <div className="flex items-center gap-1">
          {links.map((link, i) => (
            <Tooltip key={i} title={link.name}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
              >
                {link.label}
              </a>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 从 Collaboration 数据构建 Props 的辅助函数
 */
export function fromCollaboration(collaboration: {
  talentName?: string;
  talentOneId?: string;
  talentPlatform?: Platform;
  talentInfo?: {
    name?: string;
    platform?: Platform;
    platformAccountId?: string;
    platformSpecific?: Record<string, string>;
  };
}): TalentNameWithLinksProps {
  const talentInfo = collaboration.talentInfo;
  return {
    name:
      collaboration.talentName ||
      talentInfo?.name ||
      collaboration.talentOneId ||
      'N/A',
    platform:
      collaboration.talentPlatform ||
      talentInfo?.platform ||
      ('douyin' as Platform),
    platformAccountId: talentInfo?.platformAccountId,
    platformSpecific: talentInfo?.platformSpecific,
  };
}

/**
 * 从 TalentPerformance 数据构建 Props 的辅助函数
 */
export function fromTalentPerformance(record: {
  name?: string;
  platform?: Platform;
  platformAccountId?: string;
  platformSpecific?: PlatformSpecific | Record<string, string>;
}): TalentNameWithLinksProps {
  return {
    name: record.name || 'N/A',
    platform: record.platform || ('douyin' as Platform),
    platformAccountId: record.platformAccountId,
    platformSpecific: record.platformSpecific,
  };
}
