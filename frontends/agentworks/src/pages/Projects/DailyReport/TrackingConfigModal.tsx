/**
 * 追踪配置弹窗
 *
 * 包装 TrackingConfigPanel，用于日报首页的弹窗式配置
 */

import { Modal } from 'antd';
import { TrackingConfigPanel } from './TrackingConfigPanel';
import type { TrackingConfig } from '../../../types/dailyReport';

interface TrackingConfigModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 项目 ID */
  projectId: string;
  /** 项目名称 */
  projectName?: string;
  /** 初始配置 */
  initialConfig?: TrackingConfig;
  /** 关闭弹窗 */
  onClose: () => void;
  /** 配置保存成功后的回调 */
  onSave?: (config: TrackingConfig) => void;
}

export function TrackingConfigModal({
  open,
  projectId,
  projectName,
  initialConfig,
  onClose,
  onSave,
}: TrackingConfigModalProps) {
  // 配置保存成功后关闭弹窗
  const handleConfigChange = (config: TrackingConfig) => {
    onSave?.(config);
    onClose();
  };

  return (
    <Modal
      title={`追踪配置 - ${projectName || '项目'}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      <TrackingConfigPanel
        projectId={projectId}
        projectName={projectName}
        initialConfig={initialConfig}
        onConfigChange={handleConfigChange}
      />
    </Modal>
  );
}

export default TrackingConfigModal;
