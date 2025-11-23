/**
 * 删除确认弹窗 - v2.0 (Ant Design 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 Radio.Group 管理删除范围
 * 3. 使用 Checkbox 管理确认状态
 * 4. 使用 message 替代 Toast
 * 5. 使用 ExclamationCircleFilled 图标
 */

import { useState } from 'react';
import { Modal, Radio, Checkbox, Space, Button, Alert, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { logger } from '../utils/logger';
import type { Talent, Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent | null;
  onConfirm: (oneId: string, platform: Platform, deleteAll: boolean) => Promise<void>;
}

export function DeleteConfirmModal({ isOpen, onClose, talent, onConfirm }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!talent) return null;

  const handleConfirm = async () => {
    if (!confirmed) {
      message.warning('请先勾选确认框');
      return;
    }

    try {
      setDeleting(true);
      await onConfirm(talent.oneId, talent.platform, deleteAll);
      // 重置状态
      setConfirmed(false);
      setDeleteAll(false);
      message.success(deleteAll ? '已删除所有平台数据' : '已删除当前平台数据');
      onClose();
    } catch (err) {
      logger.error('删除失败:', err);
      message.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setConfirmed(false);
      setDeleteAll(false);
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <ExclamationCircleFilled className="text-2xl text-red-600" />
          <div>
            <div className="text-lg font-semibold">删除确认</div>
            <div className="text-sm font-normal text-gray-500 mt-0.5">
              此操作不可逆，请谨慎确认
            </div>
          </div>
        </div>
      }
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={640}
      destroyOnClose
      centered
      closable={!deleting}
      maskClosable={!deleting}
    >
      <div className="space-y-4">
        {/* 达人信息 */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">即将删除的达人</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">达人名称:</span>
              <span className="font-medium text-gray-900">{talent.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">平台:</span>
              <span className="font-medium text-gray-900">{PLATFORM_NAMES[talent.platform]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">OneID:</span>
              <span className="font-mono text-xs text-gray-900">{talent.oneId}</span>
            </div>
          </div>
        </div>

        {/* 警告信息 */}
        <Alert
          message="重要提示"
          description={
            <ul className="text-xs space-y-1 list-disc list-inside mt-2">
              <li>删除后，该达人的所有信息将永久丢失</li>
              <li>与该达人相关的<strong>合作记录</strong>可能会出现数据异常</li>
              <li>与该达人相关的<strong>项目关联</strong>可能会受到影响</li>
              <li>此操作<strong>无法撤销</strong>，请确保你真的要删除</li>
            </ul>
          }
          type="error"
          showIcon
          icon={<ExclamationCircleFilled />}
        />

        {/* 删除范围选项 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-3">删除范围</div>
          <Radio.Group
            value={deleteAll}
            onChange={(e) => setDeleteAll(e.target.value)}
            className="w-full"
          >
            <Space direction="vertical" className="w-full">
              <Radio
                value={false}
                className="w-full p-3 border-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="ml-2">
                  <div className="text-sm font-medium text-gray-900">
                    仅删除 <span className="text-red-600">{PLATFORM_NAMES[talent.platform]}</span> 平台数据
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    只删除该达人在当前平台的信息，保留其他平台的数据
                  </div>
                </div>
              </Radio>
              <Radio
                value={true}
                className="w-full p-3 border-2 border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <div className="ml-2">
                  <div className="text-sm font-medium text-red-900">
                    删除<strong>所有平台</strong>数据
                  </div>
                  <div className="text-xs text-red-700 mt-1">
                    删除该达人在所有平台的信息（通过 OneID 关联），这是最彻底的删除
                  </div>
                </div>
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        {/* 确认勾选 */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          >
            <span className="text-sm font-medium text-gray-900">
              我已了解删除的影响，确认要删除该达人
            </span>
          </Checkbox>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button onClick={handleClose} disabled={deleting}>
            取消
          </Button>
          <Button
            type="primary"
            danger
            onClick={handleConfirm}
            disabled={!confirmed}
            loading={deleting}
          >
            {deleteAll ? '删除所有平台' : '删除当前平台'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
