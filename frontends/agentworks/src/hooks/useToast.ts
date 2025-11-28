/**
 * useToast Hook
 * 用于管理 Toast 通知状态
 */

import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Toast';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const success = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast]
  );

  const error = useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string) => {
      showToast(message, 'warning');
    },
    [showToast]
  );

  const info = useCallback(
    (message: string) => {
      showToast(message, 'info');
    },
    [showToast]
  );

  return {
    toast,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };
}
