/**
 * 删除确认弹窗
 */

import { useState } from 'react';
import type { Talent, Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';

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
  const { toast, hideToast, warning, error: showError } = useToast();

  if (!isOpen || !talent) return null;

  const handleConfirm = async () => {
    if (!confirmed) {
      warning('请先勾选确认框');
      return;
    }

    try {
      setDeleting(true);
      await onConfirm(talent.oneId, talent.platform, deleteAll);
      // 重置状态
      setConfirmed(false);
      setDeleteAll(false);
      onClose();
    } catch (err) {
      console.error('删除失败:', err);
      showError('删除失败，请重试');
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
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleClose}
    >
      <div
        className="relative top-20 mx-auto p-0 border-0 w-full max-w-2xl shadow-2xl rounded-xl bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white bg-opacity-20">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                删除确认
              </h3>
              <p className="text-red-100 text-sm mt-1">
                此操作不可逆，请谨慎确认
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* 达人信息 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-red-900 mb-1">重要提示</h5>
                <ul className="text-xs text-red-800 space-y-1 list-disc list-inside">
                  <li>删除后，该达人的所有信息将永久丢失</li>
                  <li>与该达人相关的<strong>合作记录</strong>可能会出现数据异常</li>
                  <li>与该达人相关的<strong>项目关联</strong>可能会受到影响</li>
                  <li>此操作<strong>无法撤销</strong>，请确保你真的要删除</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 删除范围选项 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              删除范围
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={!deleteAll}
                  onChange={() => setDeleteAll(false)}
                  className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    仅删除 <span className="text-red-600">{PLATFORM_NAMES[talent.platform]}</span> 平台数据
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    只删除该达人在当前平台的信息，保留其他平台的数据
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={deleteAll}
                  onChange={() => setDeleteAll(true)}
                  className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-900">
                    删除<strong>所有平台</strong>数据
                  </div>
                  <div className="text-xs text-red-700 mt-1">
                    删除该达人在所有平台的信息（通过 OneID 关联），这是最彻底的删除
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 确认勾选 */}
          <div className="mb-6">
            <label className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 rounded"
              />
              <span className="text-sm font-medium text-gray-900">
                我已了解删除的影响，确认要删除该达人
              </span>
            </label>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={deleting}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmed || deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {deleting ? '删除中...' : deleteAll ? '删除所有平台' : '删除当前平台'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast 通知 */}
      {toast.visible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
