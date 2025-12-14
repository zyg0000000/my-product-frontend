/**
 * 批量设置客户返点弹窗 (v1.0)
 *
 * 用于批量为客户达人池中的达人设置专属返点
 * 支持：
 * - 批量设置统一返点率
 * - 预览待设置的达人列表
 * - 显示设置结果
 */

import { useState } from 'react';
import {
  Modal,
  Alert,
  Table,
  message,
  Result,
} from 'antd';
import {
  ProForm,
  ProFormDigit,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { Platform } from '../types/talent';
import { batchUpdateCustomerRebate } from '../api/customerTalents';
import { REBATE_VALIDATION, formatRebateRate } from '../types/rebate';
import { usePlatformConfig } from '../hooks/usePlatformConfig';
import { logger } from '../utils/logger';

interface TalentItem {
  oneId: string;
  name: string;
  currentRebate?: number; // 当前生效返点
}

interface BatchCustomerRebateModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  platform: Platform;
  talents: TalentItem[];
  onSuccess?: () => void;
}

type ModalStep = 'form' | 'result';

interface FailedItem {
  talentOneId: string;
  reason: string;
}

export function BatchCustomerRebateModal({
  visible,
  onClose,
  customerId,
  customerName,
  platform,
  talents,
  onSuccess,
}: BatchCustomerRebateModalProps) {
  const { getPlatformNames } = usePlatformConfig(false);
  const platformNames = getPlatformNames();

  const [step, setStep] = useState<ModalStep>('form');
  const [saving, setSaving] = useState(false);
  const [rebateRate, setRebateRate] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // 结果状态
  const [result, setResult] = useState<{
    updated: number;
    failed: FailedItem[];
  } | null>(null);

  // 重置状态
  const handleClose = () => {
    setStep('form');
    setRebateRate(undefined);
    setNotes('');
    setResult(null);
    onClose();
  };

  // 提交批量设置
  const handleSubmit = async () => {
    if (rebateRate === undefined || rebateRate === null) {
      message.error('请输入返点率');
      return;
    }

    if (rebateRate < REBATE_VALIDATION.min || rebateRate > REBATE_VALIDATION.max) {
      message.error(
        `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
      );
      return;
    }

    try {
      setSaving(true);
      const response = await batchUpdateCustomerRebate({
        customerId,
        platform,
        talents: talents.map(t => ({
          talentOneId: t.oneId,
          rate: rebateRate,
          notes: notes || undefined,
        })),
        updatedBy: 'system',
      });

      if (response.success && response.data) {
        setResult({
          updated: response.data.updated,
          failed: response.data.failed || [],
        });
        setStep('result');
        if (response.data.updated > 0) {
          onSuccess?.();
        }
      } else {
        message.error(response.message || '批量设置失败');
      }
    } catch (error) {
      logger.error('批量设置返点失败:', error);
      message.error('批量设置失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 预览表格列
  const previewColumns = [
    {
      title: '达人昵称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '当前返点',
      dataIndex: 'currentRebate',
      key: 'currentRebate',
      width: 100,
      render: (rate: number | undefined) =>
        rate !== undefined ? formatRebateRate(rate) : '-',
    },
    {
      title: '设置后返点',
      key: 'newRebate',
      width: 100,
      render: () =>
        rebateRate !== undefined ? (
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {formatRebateRate(rebateRate)}
          </span>
        ) : (
          '-'
        ),
    },
  ];

  // 失败列表表格列
  const failedColumns = [
    {
      title: '达人ID',
      dataIndex: 'talentOneId',
      key: 'talentOneId',
    },
    {
      title: '失败原因',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];

  return (
    <Modal
      title={
        step === 'form' ? (
          <div>
            <div className="text-base font-semibold">
              批量设置客户返点 ({talents.length}个达人)
            </div>
            <div className="text-xs font-normal text-content-secondary mt-1">
              为「{customerName}」批量设置达人专属返点 ({platformNames[platform] || platform})
            </div>
          </div>
        ) : (
          '设置结果'
        )
      }
      open={visible}
      onCancel={handleClose}
      footer={
        step === 'result'
          ? [
              <button
                key="close"
                className="ant-btn ant-btn-primary"
                onClick={handleClose}
              >
                完成
              </button>,
            ]
          : undefined
      }
      width={600}
      destroyOnClose
      centered
    >
      {step === 'form' && (
        <div className="space-y-4">
          <ProForm
            onFinish={handleSubmit}
            submitter={{
              render: (_, dom) => (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  {dom}
                </div>
              ),
              submitButtonProps: {
                loading: saving,
                children: `确认设置 (${talents.length}个)`,
              },
              resetButtonProps: {
                onClick: handleClose,
                children: '取消',
              },
            }}
            layout="vertical"
          >
            <ProFormDigit
              label="统一返点率"
              name="rebateRate"
              fieldProps={{
                value: rebateRate,
                onChange: value => setRebateRate(value ?? undefined),
                precision: 2,
                min: REBATE_VALIDATION.min,
                max: REBATE_VALIDATION.max,
                suffix: '%',
                placeholder: '请输入返点率',
                style: { width: '100%' },
              }}
              rules={[
                { required: true, message: '请输入返点率' },
                {
                  validator: (_: unknown, value: number) => {
                    if (
                      value < REBATE_VALIDATION.min ||
                      value > REBATE_VALIDATION.max
                    ) {
                      return Promise.reject(
                        `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            />
            <ProFormTextArea
              label="备注"
              name="notes"
              fieldProps={{
                value: notes,
                onChange: e => setNotes(e.target.value),
                placeholder: '如：批量调整返点',
                maxLength: 200,
                showCount: true,
                rows: 2,
              }}
            />
          </ProForm>

          {/* 预览列表 */}
          <div className="mt-4">
            <div className="text-sm font-medium text-content mb-2">
              待设置达人预览
            </div>
            <Table
              dataSource={talents}
              columns={previewColumns}
              pagination={false}
              size="small"
              rowKey="oneId"
              scroll={{ y: 200 }}
            />
          </div>

          <Alert
            message="提示"
            description="批量设置将为所选达人启用客户专属返点，创建合作时将自动使用该返点率。"
            type="info"
            showIcon
          />
        </div>
      )}

      {step === 'result' && result && (
        <Result
          status={result.failed.length === 0 ? 'success' : 'warning'}
          title={
            result.failed.length === 0
              ? '批量设置成功'
              : '部分设置成功'
          }
          subTitle={`成功设置 ${result.updated} 个达人${result.failed.length > 0 ? `，${result.failed.length} 个失败` : ''}`}
          extra={
            result.failed.length > 0 && (
              <div className="text-left">
                <div className="text-sm font-medium text-content mb-2">
                  失败列表
                </div>
                <Table
                  dataSource={result.failed}
                  columns={failedColumns}
                  pagination={false}
                  size="small"
                  rowKey="talentOneId"
                />
              </div>
            )
          }
        />
      )}
    </Modal>
  );
}
