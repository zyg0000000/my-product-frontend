/**
 * 抓取结果查看弹窗
 *
 * 统一风格版本 - 与 HistoryRecordsModal 保持一致
 * - 简洁的弹窗标题
 * - 使用 antd Image.PreviewGroup 预览图片
 * - 截图+提取数据 分区展示
 */

import { useMemo } from 'react';
import { Modal, Empty, Tag, Image, Divider } from 'antd';
import {
  EyeOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { RegistrationTalentItem } from '../../../../types/registration';

interface ResultViewModalProps {
  open: boolean;
  talent: RegistrationTalentItem | null;
  onClose: () => void;
}

export function ResultViewModal({
  open,
  talent,
  onClose,
}: ResultViewModalProps) {
  // 提取数据
  const result = talent?.result;
  const screenshots = useMemo(
    () => result?.screenshots ?? [],
    [result?.screenshots]
  );
  const extractedData = useMemo(
    () => result?.extractedData ?? {},
    [result?.extractedData]
  );
  const status = result?.status;

  // 渲染提取数据
  const renderExtractedData = useMemo(() => {
    const entries = Object.entries(extractedData);
    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="bg-surface-sunken rounded-lg p-3 space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-content-secondary">{key}</span>
            <span className="text-content font-medium">
              {typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  }, [extractedData]);

  // 早期返回必须在所有 hooks 之后
  if (!talent || !result) {
    return null;
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <EyeOutlined />
          抓取结果
          <span className="text-content-secondary font-normal">
            - {talent.talentName}
          </span>
          <Tag
            icon={
              status === 'success' ? (
                <CheckCircleOutlined />
              ) : (
                <CloseCircleOutlined />
              )
            }
            className={
              status === 'success'
                ? '!bg-success-500/10 !text-success-600 !border-success-500/20'
                : '!bg-error-500/10 !text-error-600 !border-error-500/20'
            }
          >
            {status === 'success' ? '成功' : '失败'}
          </Tag>
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <div className="space-y-4">
        {/* 基本信息 */}
        <div className="p-3 bg-surface-sunken rounded-lg">
          <div className="flex items-center gap-4 text-sm text-content-secondary">
            <span className="flex items-center gap-1">
              <LinkOutlined />
              {result.workflowName}
            </span>
            <span className="flex items-center gap-1">
              <ClockCircleOutlined />
              {new Date(result.fetchedAt).toLocaleString('zh-CN')}
            </span>
            <span className="text-content-muted">
              星图ID: {result.xingtuId}
            </span>
          </div>
        </div>

        {/* 截图区域 */}
        {screenshots.length > 0 && (
          <div>
            <div className="text-sm font-medium text-content mb-2">
              截图 ({screenshots.length})
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Image.PreviewGroup>
                {screenshots.map((screenshot, idx) => (
                  <div key={idx} className="relative">
                    <Image
                      src={screenshot.url}
                      alt={screenshot.name}
                      className="rounded-lg object-cover w-full aspect-video"
                      preview={{
                        mask: (
                          <div className="flex items-center gap-1">
                            <EyeOutlined /> 查看
                          </div>
                        ),
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                      <span className="text-white text-xs truncate block">
                        {screenshot.name}
                      </span>
                    </div>
                  </div>
                ))}
              </Image.PreviewGroup>
            </div>
          </div>
        )}

        {screenshots.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span className="text-content-muted">暂无截图</span>}
          />
        )}

        {/* 提取数据区域 */}
        {Object.keys(extractedData).length > 0 && (
          <>
            <Divider className="my-4" />
            <div>
              <div className="text-sm font-medium text-content mb-2">
                提取数据
              </div>
              {renderExtractedData}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
