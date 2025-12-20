/**
 * 执行看板 - 查看弹窗组件（只读）
 */

import { useMemo } from 'react';
import {
  Modal,
  Descriptions,
  Button,
  Space,
  Tag,
  Alert,
  App,
  Tooltip,
} from 'antd';
import { LinkOutlined, CopyOutlined } from '@ant-design/icons';
import type { CollaborationWithProject } from '../types';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { useTalentLinks } from '../../../hooks/useTalentLinks';
import {
  getCollabStatusLabel,
  STATUS_COLORS,
  formatShortDate,
  parseLocalDate,
} from '../utils';

interface ViewModalProps {
  collaboration: CollaborationWithProject | null;
  open: boolean;
  onClose: () => void;
}

export function ViewModal({ collaboration, open, onClose }: ViewModalProps) {
  const { message } = App.useApp();

  const { getPlatformNames } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const { getCollaborationLinks, getVideoLink } = useTalentLinks();

  // 获取任务外链
  const taskLink = useMemo(() => {
    if (!collaboration?.taskId) return null;
    const links = getCollaborationLinks(
      collaboration.talentPlatform,
      { taskId: collaboration.taskId, videoId: collaboration.videoId },
      undefined,
      'taskId'
    );
    return links[0]?.url || null;
  }, [collaboration, getCollaborationLinks]);

  // 获取视频外链
  const videoLink = useMemo(() => {
    if (!collaboration?.videoId) return null;
    return getVideoLink(collaboration.talentPlatform, collaboration.videoId);
  }, [collaboration, getVideoLink]);

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} 已复制`);
  };

  // 打开外链
  const openLink = (url: string) => {
    window.open(url, '_blank');
  };

  if (!collaboration) return null;

  const talentName =
    collaboration.talentInfo?.name || collaboration.talentName || '未知达人';
  const platformName =
    platformNames[collaboration.talentPlatform] || collaboration.talentPlatform;
  const statusKey = getCollabStatusLabel(collaboration);
  const statusConfig = STATUS_COLORS[statusKey];

  // 项目状态映射
  const projectStatusMap: Record<string, { label: string; color: string }> = {
    executing: { label: '执行中', color: 'processing' },
    pending_settlement: { label: '待结算', color: 'warning' },
    settled: { label: '已收款', color: 'success' },
    closed: { label: '已终结', color: 'default' },
  };
  const projectStatusInfo = projectStatusMap[collaboration.projectStatus] || {
    label: '未知',
    color: 'default',
  };

  return (
    <Modal
      title="查看发布详情"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={560}
    >
      {/* 项目已结束提示 */}
      <Alert
        type="warning"
        message="项目非执行中状态，无法编辑"
        className="mb-4"
        showIcon
      />

      {/* 详细信息 */}
      <Descriptions
        size="small"
        column={2}
        bordered
        labelStyle={{ width: 100 }}
      >
        <Descriptions.Item label="项目名称" span={2}>
          <Space>
            {collaboration.projectName}
            <Tag color={projectStatusInfo.color}>{projectStatusInfo.label}</Tag>
          </Space>
        </Descriptions.Item>

        <Descriptions.Item label="平台">{platformName}</Descriptions.Item>

        <Descriptions.Item label="达人">{talentName}</Descriptions.Item>

        <Descriptions.Item label="发布状态">
          <Tag className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
            {statusConfig.label}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="合作状态">
          {collaboration.status}
        </Descriptions.Item>

        <Descriptions.Item label="计划发布日期">
          {collaboration.plannedReleaseDate
            ? formatShortDate(parseLocalDate(collaboration.plannedReleaseDate))
            : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="实际发布日期">
          {collaboration.actualReleaseDate
            ? formatShortDate(parseLocalDate(collaboration.actualReleaseDate))
            : '-'}
        </Descriptions.Item>

        <Descriptions.Item label="星图任务ID" span={2}>
          {collaboration.taskId ? (
            <Space>
              <span className="font-mono text-xs">{collaboration.taskId}</span>
              <Tooltip title="复制">
                <CopyOutlined
                  className="cursor-pointer hover:text-primary-500"
                  onClick={() =>
                    copyToClipboard(collaboration.taskId!, '任务ID')
                  }
                />
              </Tooltip>
              {taskLink && (
                <Tooltip title="打开星图">
                  <LinkOutlined
                    className="cursor-pointer hover:text-primary-500"
                    onClick={() => openLink(taskLink)}
                  />
                </Tooltip>
              )}
            </Space>
          ) : (
            '-'
          )}
        </Descriptions.Item>

        <Descriptions.Item label="视频ID" span={2}>
          {collaboration.videoId ? (
            <Space>
              <span className="font-mono text-xs">{collaboration.videoId}</span>
              <Tooltip title="复制">
                <CopyOutlined
                  className="cursor-pointer hover:text-primary-500"
                  onClick={() =>
                    copyToClipboard(collaboration.videoId!, '视频ID')
                  }
                />
              </Tooltip>
              {videoLink && (
                <Tooltip title="打开视频">
                  <LinkOutlined
                    className="cursor-pointer hover:text-primary-500"
                    onClick={() => openLink(videoLink)}
                  />
                </Tooltip>
              )}
            </Space>
          ) : (
            '-'
          )}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
