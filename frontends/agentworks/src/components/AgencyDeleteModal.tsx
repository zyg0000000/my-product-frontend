/**
 * 机构删除确认弹窗 - v2.0 (Ant Design 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 Checkbox 管理确认状态
 * 3. 使用 message 替代 Toast
 * 4. 使用 ExclamationCircleFilled 图标
 */

import { useState } from 'react';
import { Modal, Checkbox, Button, Alert, message } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import type { Agency } from '../types/agency';

interface AgencyDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onConfirm: (agencyId: string) => Promise<void>;
  talentCount?: number;
}

export function AgencyDeleteModal({
  isOpen,
  onClose,
  agency,
  onConfirm,
  talentCount = 0,
}: AgencyDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!agency) return null;

  const handleConfirm = async () => {
    if (!confirmed) {
      message.warning('请先勾选确认框');
      return;
    }

    try {
      setDeleting(true);
      await onConfirm(agency.id);
      // 重置状态
      setConfirmed(false);
      message.success('机构删除成功');
      onClose();
    } catch (err) {
      message.error('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setConfirmed(false);
      onClose();
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ExclamationCircleFilled className="text-xl text-red-600" />
          <div>
            <div className="text-base font-semibold">删除确认</div>
            <div className="text-xs font-normal text-gray-500 mt-0.5">
              此操作不可逆，请谨慎确认
            </div>
          </div>
        </div>
      }
      open={isOpen}
      onCancel={handleClose}
      footer={null}
      width={560}
      destroyOnHidden
      centered
      closable={!deleting}
      maskClosable={!deleting}
    >
      <div className="space-y-3">
        {/* 机构信息 */}
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-1.5">即将删除的机构</h4>
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">机构名称:</span>
              <span className="font-medium text-gray-900">{agency.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">机构ID:</span>
              <span className="font-mono text-xs text-gray-900">{agency.id}</span>
            </div>
            {talentCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">达人数量:</span>
                <span className="font-semibold text-red-600">{talentCount} 位</span>
              </div>
            )}
          </div>
        </div>

        {/* 警告信息 */}
        <Alert
          message="重要提示"
          description={
            <ul className="text-xs space-y-0.5 list-disc list-inside mt-1">
              <li>删除后，该机构的所有信息将永久丢失</li>
              {talentCount > 0 && (
                <li className="text-red-700 font-medium">
                  该机构下还有 <strong>{talentCount}</strong> 位达人，删除可能影响达人数据
                </li>
              )}
              <li>与该机构相关的<strong>返点配置</strong>将被清除</li>
              <li>此操作<strong>无法撤销</strong>，请确保你真的要删除</li>
            </ul>
          }
          type="error"
          showIcon
          icon={<ExclamationCircleFilled />}
          className="compact-alert"
        />

        {/* 确认勾选 */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <Checkbox
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          >
            <span className="text-xs font-medium text-gray-900">
              我已了解删除的影响，确认要删除机构「{agency.name}」
            </span>
          </Checkbox>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={handleClose} disabled={deleting} size="middle">
            取消
          </Button>
          <Button
            type="primary"
            danger
            onClick={handleConfirm}
            disabled={!confirmed}
            loading={deleting}
            size="middle"
          >
            确认删除
          </Button>
        </div>
      </div>

      <style>{`
        .compact-alert .ant-alert-message {
          font-size: 13px;
          margin-bottom: 4px;
        }
        .compact-alert .ant-alert-description {
          font-size: 12px;
        }
        .compact-alert {
          padding: 10px 12px;
        }
      `}</style>
    </Modal>
  );
}
