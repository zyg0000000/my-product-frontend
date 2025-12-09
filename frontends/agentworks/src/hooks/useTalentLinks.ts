/**
 * 达人外链 Hook
 *
 * @version 1.0.0
 * @description 提供达人外链生成功能，支持多平台、多外链配置
 *
 * 功能：
 * - 根据平台配置生成外链
 * - 支持过滤只显示在达人昵称后的外链
 * - 兼容不同数据结构（Talent、Collaboration 等）
 */

import { useCallback } from 'react';
import { usePlatformConfig } from './usePlatformConfig';
import type { Platform } from '../types/talent';
import type { LinkConfig } from '../api/platformConfig';

/**
 * 生成的外链项
 */
export interface TalentLinkItem {
  name: string; // 链接名称，如"星图主页"
  label: string; // 显示标签，如"星图"
  url: string; // 完整 URL
}

/**
 * 达人数据接口（支持多种数据结构）
 */
export interface TalentLike {
  platform: Platform;
  platformAccountId?: string;
  platformSpecific?: Record<string, string>;
}

/**
 * 达人外链 Hook
 */
export function useTalentLinks() {
  const { getPlatformConfigByKey } = usePlatformConfig();

  /**
   * 根据达人数据和外链配置生成 URL
   */
  const generateLinkUrl = useCallback(
    (talent: TalentLike, link: LinkConfig): string | null => {
      const platformSpecificData = talent.platformSpecific as
        | Record<string, string>
        | undefined;
      const idValue =
        platformSpecificData?.[link.idField] || talent.platformAccountId;
      if (!idValue) return null;
      return link.template.replace('{id}', idValue);
    },
    []
  );

  /**
   * 获取应在达人昵称后显示的外链
   * @param talent 达人数据
   * @returns 外链列表
   */
  const getTalentNameLinks = useCallback(
    (talent: TalentLike): TalentLinkItem[] => {
      const config = getPlatformConfigByKey(talent.platform);
      if (!config) return [];

      // 兼容旧数据：如果有 links 用 links，否则从 link 转换
      const linksConfig: LinkConfig[] =
        config.links ||
        (config.link
          ? [
              {
                name: '外链',
                label: '链接',
                template: config.link.template,
                idField: config.link.idField,
                showInTalentName: true,
              },
            ]
          : []);

      // 只返回 showInTalentName !== false 的外链（默认为 true）
      return linksConfig
        .filter(link => link.showInTalentName !== false)
        .map(link => {
          const url = generateLinkUrl(talent, link);
          if (!url) return null;
          return {
            name: link.name,
            label: link.label,
            url,
          };
        })
        .filter((item): item is TalentLinkItem => item !== null);
    },
    [getPlatformConfigByKey, generateLinkUrl]
  );

  /**
   * 获取所有外链（不过滤 showInTalentName）
   * @param talent 达人数据
   * @returns 外链列表
   */
  const getAllLinks = useCallback(
    (talent: TalentLike): TalentLinkItem[] => {
      const config = getPlatformConfigByKey(talent.platform);
      if (!config) return [];

      const linksConfig: LinkConfig[] =
        config.links ||
        (config.link
          ? [
              {
                name: '外链',
                label: '链接',
                template: config.link.template,
                idField: config.link.idField,
              },
            ]
          : []);

      return linksConfig
        .map(link => {
          const url = generateLinkUrl(talent, link);
          if (!url) return null;
          return {
            name: link.name,
            label: link.label,
            url,
          };
        })
        .filter((item): item is TalentLinkItem => item !== null);
    },
    [getPlatformConfigByKey, generateLinkUrl]
  );

  return {
    getTalentNameLinks,
    getAllLinks,
    generateLinkUrl,
  };
}
