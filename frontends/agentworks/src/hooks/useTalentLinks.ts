/**
 * 达人外链 Hook
 *
 * @version 2.0.0
 * @description 提供达人外链生成功能，支持多平台、多外链配置
 *
 * 功能：
 * - 根据平台配置生成外链
 * - 支持从达人数据或合作记录获取 ID
 * - 支持过滤只显示在达人昵称后的外链
 * - 支持过滤只显示在合作记录中的外链
 * - 兼容不同数据结构（Talent、Collaboration 等）
 */

import { useCallback } from 'react';
import { usePlatformConfig } from './usePlatformConfig';
import type { Platform, PlatformSpecific } from '../types/talent';
import type { LinkConfig, LinkIdSource } from '../api/platformConfig';

/**
 * 生成的外链项
 */
export interface TalentLinkItem {
  name: string; // 链接名称，如"星图主页"
  label: string; // 显示标签，如"星图"
  url: string; // 完整 URL
  idSource?: LinkIdSource; // 数据来源
}

/**
 * 达人数据接口（支持多种数据结构）
 */
export interface TalentLike {
  platform: Platform;
  platformAccountId?: string;
  platformSpecific?: PlatformSpecific | Record<string, string>;
}

/**
 * 合作记录数据接口
 */
export interface CollaborationLike {
  videoId?: string;
  videoUrl?: string;
  taskId?: string;
  [key: string]: unknown;
}

/**
 * 达人外链 Hook
 */
export function useTalentLinks() {
  const { getPlatformConfigByKey } = usePlatformConfig();

  /**
   * 从达人数据获取 ID 值
   */
  const getIdFromTalent = useCallback(
    (talent: TalentLike, idField: string): string | null => {
      const platformSpecificData = talent.platformSpecific as
        | Record<string, string>
        | undefined;
      // 优先从 platformSpecific 获取，fallback 到 platformAccountId
      return platformSpecificData?.[idField] || talent.platformAccountId || null;
    },
    []
  );

  /**
   * 从合作记录获取 ID 值
   */
  const getIdFromCollaboration = useCallback(
    (collaboration: CollaborationLike, idField: string): string | null => {
      const value = collaboration[idField];
      return typeof value === 'string' ? value : null;
    },
    []
  );

  /**
   * 根据数据源和配置生成 URL
   */
  const generateLinkUrl = useCallback(
    (
      link: LinkConfig,
      talent?: TalentLike,
      collaboration?: CollaborationLike
    ): string | null => {
      const idSource = link.idSource || 'talent';
      let idValue: string | null = null;

      if (idSource === 'talent' && talent) {
        idValue = getIdFromTalent(talent, link.idField);
      } else if (idSource === 'collaboration' && collaboration) {
        idValue = getIdFromCollaboration(collaboration, link.idField);
      }

      if (!idValue) return null;
      return link.template.replace('{id}', idValue);
    },
    [getIdFromTalent, getIdFromCollaboration]
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
                idSource: 'talent',
                showInTalentName: true,
              },
            ]
          : []);

      // 只返回 showInTalentName !== false 且 idSource 为 talent 的外链
      return linksConfig
        .filter(
          (link): link is LinkConfig =>
            link != null &&
            link.showInTalentName !== false &&
            (link.idSource || 'talent') === 'talent'
        )
        .map(link => {
          const url = generateLinkUrl(link, talent);
          if (!url) return null;
          return {
            name: link.name,
            label: link.label,
            url,
            idSource: link.idSource || 'talent',
          };
        })
        .filter((item): item is TalentLinkItem => item !== null);
    },
    [getPlatformConfigByKey, generateLinkUrl]
  );

  /**
   * 获取应在合作记录中显示的外链
   * @param platform 平台
   * @param collaboration 合作记录数据
   * @param talent 达人数据（可选，用于获取达人来源的外链）
   * @param filterByIdField 可选，只返回指定 idField 的外链（用于在特定列后显示）
   * @returns 外链列表
   */
  const getCollaborationLinks = useCallback(
    (
      platform: Platform,
      collaboration: CollaborationLike,
      talent?: TalentLike,
      filterByIdField?: string
    ): TalentLinkItem[] => {
      const config = getPlatformConfigByKey(platform);
      if (!config) return [];

      const linksConfig: LinkConfig[] = config.links || [];

      // 只返回 showInCollaboration === true 的外链
      // 如果指定了 filterByIdField，还需要过滤 idField 匹配的外链
      return linksConfig
        .filter(
          (link): link is LinkConfig =>
            link != null &&
            link.showInCollaboration === true &&
            (filterByIdField ? link.idField === filterByIdField : true)
        )
        .map(link => {
          const url = generateLinkUrl(link, talent, collaboration);
          if (!url) return null;
          return {
            name: link.name,
            label: link.label,
            url,
            idSource: link.idSource || 'talent',
          };
        })
        .filter((item): item is TalentLinkItem => item !== null);
    },
    [getPlatformConfigByKey, generateLinkUrl]
  );

  /**
   * 获取所有外链（不过滤显示位置）
   * @param talent 达人数据
   * @param collaboration 合作记录数据（可选）
   * @returns 外链列表
   */
  const getAllLinks = useCallback(
    (talent: TalentLike, collaboration?: CollaborationLike): TalentLinkItem[] => {
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
                idSource: 'talent' as LinkIdSource,
              },
            ]
          : []);

      return linksConfig
        .filter((link): link is LinkConfig => link != null)
        .map(link => {
          const url = generateLinkUrl(link, talent, collaboration);
          if (!url) return null;
          return {
            name: link.name,
            label: link.label,
            url,
            idSource: link.idSource || 'talent',
          };
        })
        .filter((item): item is TalentLinkItem => item !== null);
    },
    [getPlatformConfigByKey, generateLinkUrl]
  );

  /**
   * 根据视频ID生成视频链接（便捷方法）
   * @param platform 平台
   * @param videoId 视频ID
   * @returns 视频链接或 null
   */
  const getVideoLink = useCallback(
    (platform: Platform, videoId: string): string | null => {
      const config = getPlatformConfigByKey(platform);
      if (!config || !config.links) return null;

      // 查找 idField 为 videoId 且 idSource 为 collaboration 的外链
      const videoLinkConfig = config.links.find(
        link =>
          link != null &&
          link.idField === 'videoId' &&
          (link.idSource || 'talent') === 'collaboration'
      );

      if (!videoLinkConfig) return null;
      return videoLinkConfig.template.replace('{id}', videoId);
    },
    [getPlatformConfigByKey]
  );

  return {
    getTalentNameLinks,
    getCollaborationLinks,
    getAllLinks,
    generateLinkUrl,
    getVideoLink,
  };
}
