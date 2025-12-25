/**
 * 执行看板 - 编辑弹窗组件
 * 优化版：紧凑布局，统一产品风格
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  App,
  Tooltip,
  Tag,
} from 'antd';
import {
  LinkOutlined,
  CopyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  CollaborationWithProject,
  UpdateCollaborationRequest,
} from '../types';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import { useTalentLinks } from '../../../hooks/useTalentLinks';
import { STATUS_COLORS, getCollabStatusLabel } from '../utils';

interface EditModalProps {
  collaboration: CollaborationWithProject | null;
  open: boolean;
  onSave: (id: string, data: UpdateCollaborationRequest) => Promise<boolean>;
  onCancel: () => void;
}

export function EditModal({
  collaboration,
  open,
  onSave,
  onCancel,
}: EditModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const { getPlatformNames, getPlatformColors } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);
  const platformColors = useMemo(
    () => getPlatformColors(),
    [getPlatformColors]
  );
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

  // 初始化表单
  useEffect(() => {
    if (open && collaboration) {
      form.setFieldsValue({
        plannedReleaseDate: collaboration.plannedReleaseDate
          ? dayjs(collaboration.plannedReleaseDate)
          : null,
        actualReleaseDate: collaboration.actualReleaseDate
          ? dayjs(collaboration.actualReleaseDate)
          : null,
        taskId: collaboration.taskId || '',
        videoId: collaboration.videoId || '',
      });
    }
  }, [open, collaboration, form]);

  // 处理保存
  const handleSave = async () => {
    if (!collaboration) return;

    try {
      const values = await form.validateFields();
      setSaving(true);

      const data: UpdateCollaborationRequest = {
        plannedReleaseDate: values.plannedReleaseDate
          ? values.plannedReleaseDate.format('YYYY-MM-DD')
          : undefined,
        actualReleaseDate: values.actualReleaseDate
          ? values.actualReleaseDate.format('YYYY-MM-DD')
          : undefined,
        taskId: values.taskId || undefined,
        videoId: values.videoId || undefined,
      };

      // 如果填写了视频ID或任务ID，自动更新状态为已发布
      if (values.videoId || values.taskId) {
        data.status = '视频已发布';
      }

      const success = await onSave(collaboration.id, data);
      if (success) {
        message.success('保存成功');
        onCancel();
      } else {
        message.error('保存失败，请重试');
      }
    } catch (err) {
      // 表单验证失败
    } finally {
      setSaving(false);
    }
  };

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
  const platformColor = platformColors[collaboration.talentPlatform] || 'blue';
  const statusKey = getCollabStatusLabel(collaboration);
  const statusConfig = STATUS_COLORS[statusKey];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-500 rounded-full" />
          <span>编辑发布信息</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-content-muted">
            <InfoCircleOutlined className="text-primary-400" />
            <span>填写视频ID或任务ID后，状态将自动更新为「视频已发布」</span>
          </div>
          <div className="flex gap-2">
            <Button size="small" onClick={onCancel}>
              取消
            </Button>
            <Button
              size="small"
              type="primary"
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
          </div>
        </div>
      }
      width={480}
      destroyOnHidden
      className="edit-modal-compact"
    >
      {/* 基本信息卡片 */}
      <div className="bg-surface-subtle rounded-lg p-3 mb-4 border border-stroke/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {/* 项目 & 平台 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted w-10 shrink-0">
              项目
            </span>
            <span
              className="text-sm font-medium text-content truncate"
              title={collaboration.projectName}
            >
              {collaboration.projectName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted w-10 shrink-0">
              平台
            </span>
            <Tag
              color={platformColor}
              className="text-xs m-0 px-2 py-0 leading-5 rounded"
            >
              {platformName}
            </Tag>
          </div>
          {/* 达人 & 状态 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted w-10 shrink-0">
              达人
            </span>
            <span
              className="text-sm font-medium text-content truncate"
              title={talentName}
            >
              {talentName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted w-10 shrink-0">
              状态
            </span>
            <Tag
              className={`text-xs m-0 px-2 py-0 leading-5 rounded ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </Tag>
          </div>
        </div>
      </div>

      {/* 编辑表单 - 紧凑布局 */}
      <Form
        form={form}
        layout="vertical"
        size="small"
        className="edit-form-compact"
      >
        {/* 日期行 - 两列 */}
        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="plannedReleaseDate"
            label={<span className="text-xs font-medium">计划发布日期</span>}
            className="mb-3"
          >
            <DatePicker className="w-full" placeholder="选择日期" />
          </Form.Item>
          <Form.Item
            name="actualReleaseDate"
            label={<span className="text-xs font-medium">实际发布日期</span>}
            className="mb-3"
          >
            <DatePicker className="w-full" placeholder="选择日期" />
          </Form.Item>
        </div>

        {/* ID 输入行 */}
        <Form.Item
          name="taskId"
          label={<span className="text-xs font-medium">星图任务ID</span>}
          className="mb-3"
        >
          <Input
            placeholder="输入星图任务ID"
            suffix={
              collaboration.taskId ? (
                <div className="flex items-center gap-1">
                  <Tooltip title="复制">
                    <CopyOutlined
                      className="text-content-muted cursor-pointer hover:text-primary-500 transition-colors"
                      onClick={() =>
                        copyToClipboard(collaboration.taskId!, '任务ID')
                      }
                    />
                  </Tooltip>
                  {taskLink && (
                    <Tooltip title="打开星图">
                      <LinkOutlined
                        className="text-content-muted cursor-pointer hover:text-primary-500 transition-colors"
                        onClick={() => openLink(taskLink)}
                      />
                    </Tooltip>
                  )}
                </div>
              ) : null
            }
          />
        </Form.Item>

        <Form.Item
          name="videoId"
          label={<span className="text-xs font-medium">视频ID</span>}
          className="mb-0"
        >
          <Input
            placeholder="输入视频ID"
            suffix={
              collaboration.videoId ? (
                <div className="flex items-center gap-1">
                  <Tooltip title="复制">
                    <CopyOutlined
                      className="text-content-muted cursor-pointer hover:text-primary-500 transition-colors"
                      onClick={() =>
                        copyToClipboard(collaboration.videoId!, '视频ID')
                      }
                    />
                  </Tooltip>
                  {videoLink && (
                    <Tooltip title="打开视频">
                      <LinkOutlined
                        className="text-content-muted cursor-pointer hover:text-primary-500 transition-colors"
                        onClick={() => openLink(videoLink)}
                      />
                    </Tooltip>
                  )}
                </div>
              ) : null
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
