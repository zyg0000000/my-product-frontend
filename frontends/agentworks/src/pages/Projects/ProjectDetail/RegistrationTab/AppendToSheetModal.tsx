/**
 * 追加达人数据到已有飞书表格弹窗组件
 *
 * 功能：
 * - 显示目标表格信息
 * - 展示可追加的达人列表（已抓取成功但未在该表格中）
 * - 支持勾选要追加的达人
 * - 调用云函数追加数据
 */

import { useState, useMemo } from 'react';
import { Modal, List, Button, Checkbox, Empty, App, Spin, Alert } from 'antd';
import {
  FileExcelOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import type {
  GeneratedSheet,
  RegistrationTalentItem,
} from '../../../../types/registration';

interface AppendToSheetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  targetSheet: GeneratedSheet | null;
  allTalents: RegistrationTalentItem[];
}

export function AppendToSheetModal({
  open,
  onClose,
  onSuccess,
  projectId,
  targetSheet,
  allTalents,
}: AppendToSheetModalProps) {
  const { message } = App.useApp();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [appending, setAppending] = useState(false);

  // 筛选可追加的达人：
  // 1. 已抓取成功（当前项目有结果）
  // 2. 不在目标表格中
  const appendableTalents = useMemo(() => {
    if (!targetSheet) return [];

    // 获取目标表格中已有的达人 ID
    const existingCollabIds = new Set<string>();
    allTalents.forEach(t => {
      if (t.generatedSheets?.some(s => s.sheetId === targetSheet._id)) {
        existingCollabIds.add(t.collaborationId);
      }
    });

    // 过滤：已抓取成功 + 不在表格中
    return allTalents.filter(
      t =>
        t.hasResult &&
        t.fetchStatus === 'success' &&
        !existingCollabIds.has(t.collaborationId)
    );
  }, [allTalents, targetSheet]);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(appendableTalents.map(t => t.collaborationId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 单个选择
  const handleSelect = (collaborationId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(collaborationId);
    } else {
      newSet.delete(collaborationId);
    }
    setSelectedIds(newSet);
  };

  // 追加数据
  const handleAppend = async () => {
    if (!targetSheet) return;

    if (selectedIds.size === 0) {
      message.warning('请选择要追加的达人');
      return;
    }

    if (!targetSheet.templateId) {
      message.error('目标表格缺少模板信息，无法追加');
      return;
    }

    if (!targetSheet.sheetToken) {
      message.error('目标表格缺少 Token 信息，无法追加');
      return;
    }

    setAppending(true);

    try {
      const result = await registrationApi.appendToRegistrationSheet({
        sheetId: targetSheet._id,
        sheetToken: targetSheet.sheetToken,
        templateId: targetSheet.templateId,
        projectId,
        collaborationIds: Array.from(selectedIds),
      });

      if (result.success) {
        const data = result.data as {
          appendedCount?: number;
          skippedCount?: number;
          message?: string;
        };
        message.success(
          data?.message ||
            `成功追加 ${data?.appendedCount || selectedIds.size} 个达人`
        );

        // 打开表格
        if (targetSheet.sheetUrl) {
          window.open(targetSheet.sheetUrl, '_blank');
        }

        // 重置状态并关闭
        setSelectedIds(new Set());
        onSuccess();
      } else {
        throw new Error(result.message || '追加失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error('追加失败: ' + error.message);
      }
      console.error('追加数据错误:', error);
    } finally {
      setAppending(false);
    }
  };

  // 关闭时重置状态
  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const isAllSelected =
    appendableTalents.length > 0 &&
    selectedIds.size === appendableTalents.length;
  const isIndeterminate =
    selectedIds.size > 0 && selectedIds.size < appendableTalents.length;

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <PlusOutlined />
          追加数据到表格
        </span>
      }
      open={open}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={appending}>
          取消
        </Button>,
        <Button
          key="append"
          type="primary"
          icon={<PlusOutlined />}
          loading={appending}
          onClick={handleAppend}
          disabled={selectedIds.size === 0}
        >
          追加 ({selectedIds.size}) 个达人
        </Button>,
      ]}
      destroyOnClose
    >
      {appending ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <div className="mt-4 text-content-secondary">
            正在追加数据，请稍候...
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 目标表格信息 */}
          {targetSheet && (
            <Alert
              type="info"
              showIcon
              icon={<FileExcelOutlined />}
              message={
                <span>
                  目标表格：<strong>{targetSheet.fileName}</strong>
                  <span className="text-content-muted ml-2">
                    （已有 {targetSheet.talentCount} 个达人）
                  </span>
                </span>
              }
            />
          )}

          {/* 可追加达人列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1 text-content-secondary">
                <UserOutlined />
                可追加的达人
              </span>
              {appendableTalents.length > 0 && (
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={e => handleSelectAll(e.target.checked)}
                >
                  全选
                </Checkbox>
              )}
            </div>

            {appendableTalents.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="没有可追加的达人（所有已抓取的达人都已在表格中）"
              />
            ) : (
              <div className="max-h-72 overflow-y-auto border border-stroke rounded-lg">
                <List
                  size="small"
                  dataSource={appendableTalents}
                  renderItem={talent => (
                    <List.Item className="px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        checked={selectedIds.has(talent.collaborationId)}
                        onChange={e =>
                          handleSelect(talent.collaborationId, e.target.checked)
                        }
                      >
                        <span className="ml-2">{talent.talentName}</span>
                        {talent.xingtuId && (
                          <span className="text-content-muted text-xs ml-2">
                            (星图ID: {talent.xingtuId})
                          </span>
                        )}
                      </Checkbox>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>

          {/* 提示信息 */}
          {appendableTalents.length > 0 && (
            <div className="text-xs text-content-muted">
              提示：只显示已抓取成功且不在目标表格中的达人
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
