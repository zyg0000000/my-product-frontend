/**
 * 历史抓取记录查看弹窗（跨项目复用）
 *
 * 功能：
 * - 显示达人在其他项目的历史抓取记录
 * - 分类展示：推荐 / 其他可用 / 已过期
 * - 支持查看截图和数据详情
 */

import { useState, useMemo } from 'react';
import { Modal, Tag, Empty, Button, Divider, Tooltip, Image } from 'antd';
import {
  StarOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type {
  RegistrationTalentItem,
  HistoryRecord,
} from '../../../../types/registration';

interface HistoryRecordsModalProps {
  open: boolean;
  talent: RegistrationTalentItem | null;
  onClose: () => void;
}

export function HistoryRecordsModal({
  open,
  talent,
  onClose,
}: HistoryRecordsModalProps) {
  // 当前选中查看详情的记录
  const [viewingRecord, setViewingRecord] = useState<HistoryRecord | null>(
    null
  );

  // 分类历史记录
  const { recommendedRecords, otherValidRecords, expiredRecords } =
    useMemo(() => {
      if (!talent?.historyRecords) {
        return {
          recommendedRecords: [] as HistoryRecord[],
          otherValidRecords: [] as HistoryRecord[],
          expiredRecords: [] as HistoryRecord[],
        };
      }

      const records = talent.historyRecords;
      const recommended = talent.recommendedRecord;

      // 推荐记录
      const recommendedRecords = recommended ? [recommended] : [];

      // 其他未过期记录（排除推荐的）
      const otherValidRecords = records.filter(
        r => !r.isExpired && r.collaborationId !== recommended?.collaborationId
      );

      // 已过期记录
      const expiredRecords = records.filter(r => r.isExpired);

      return { recommendedRecords, otherValidRecords, expiredRecords };
    }, [talent]);

  // 渲染单条记录
  const renderRecordItem = (
    record: HistoryRecord,
    type: 'recommended' | 'valid' | 'expired'
  ) => {
    const isRecommended = type === 'recommended';
    const isExpired = type === 'expired';

    return (
      <div
        key={record.collaborationId}
        className={`
          p-4 rounded-lg border transition-all
          ${isRecommended ? 'border-primary-500 bg-primary-500/5' : ''}
          ${isExpired ? 'border-stroke bg-surface-sunken opacity-70' : ''}
          ${!isRecommended && !isExpired ? 'border-stroke hover:border-primary-400' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* 项目名称 + 标签 */}
            <div className="flex items-center gap-2 mb-2">
              <FolderOutlined className="text-content-secondary" />
              <span className="font-medium text-content truncate">
                {record.projectName}
              </span>
              {isRecommended && (
                <Tag
                  icon={<StarOutlined />}
                  className="!bg-warning-500/10 !text-warning-600 !border-warning-500/20"
                >
                  推荐
                </Tag>
              )}
              {isExpired && (
                <Tooltip title="抓取时间距离当前合作创建时间超过30天">
                  <Tag
                    icon={<ExclamationCircleOutlined />}
                    className="!bg-warning-500/10 !text-warning-600 !border-warning-500/20"
                  >
                    已过期
                  </Tag>
                </Tooltip>
              )}
            </div>

            {/* 抓取时间信息 */}
            <div className="flex items-center gap-4 text-sm text-content-secondary">
              <span className="flex items-center gap-1">
                <ClockCircleOutlined />
                抓取于 {new Date(record.fetchedAt).toLocaleDateString('zh-CN')}
              </span>
              <span>
                距合作创建{' '}
                <span
                  className={
                    isExpired ? 'text-warning-500' : 'text-primary-500'
                  }
                >
                  {record.daysDiff}
                </span>{' '}
                天
              </span>
            </div>

            {/* 截图预览（如果有） */}
            {record.result?.screenshots &&
              record.result.screenshots.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  <Image.PreviewGroup>
                    {record.result.screenshots
                      .slice(0, 3)
                      .map((screenshot, idx) => (
                        <Image
                          key={idx}
                          src={screenshot.url}
                          alt={screenshot.name}
                          width={60}
                          height={60}
                          className="rounded object-cover cursor-pointer"
                          preview={{
                            mask: <EyeOutlined />,
                          }}
                        />
                      ))}
                  </Image.PreviewGroup>
                  {record.result.screenshots.length > 3 && (
                    <div className="w-[60px] h-[60px] rounded bg-surface-sunken flex items-center justify-center text-content-secondary text-sm">
                      +{record.result.screenshots.length - 3}
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-2">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setViewingRecord(record)}
            >
              查看详情
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染详情视图
  const renderDetailView = () => {
    if (!viewingRecord) return null;

    const { result } = viewingRecord;
    const screenshots = result?.screenshots || [];
    const extractedData = result?.extractedData || {};

    return (
      <div className="space-y-4">
        {/* 返回按钮 */}
        <Button size="small" onClick={() => setViewingRecord(null)}>
          返回列表
        </Button>

        {/* 来源信息 */}
        <div className="p-3 bg-surface-sunken rounded-lg">
          <div className="text-sm text-content-secondary">
            来自项目「{viewingRecord.projectName}」的抓取记录
          </div>
          <div className="text-xs text-content-muted mt-1">
            抓取时间：
            {new Date(viewingRecord.fetchedAt).toLocaleString('zh-CN')}
            ，距合作创建 {viewingRecord.daysDiff} 天
          </div>
        </div>

        {/* 截图 */}
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

        {/* 提取数据 */}
        {Object.keys(extractedData).length > 0 && (
          <div>
            <div className="text-sm font-medium text-content mb-2">
              提取数据
            </div>
            <div className="bg-surface-sunken rounded-lg p-3 space-y-2">
              {Object.entries(extractedData).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-content-secondary">{key}</span>
                  <span className="text-content font-medium">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 没有历史记录
  const hasNoRecords =
    recommendedRecords.length === 0 &&
    otherValidRecords.length === 0 &&
    expiredRecords.length === 0;

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <HistoryOutlined />
          历史抓取记录
          {talent && (
            <span className="text-content-secondary font-normal">
              - {talent.talentName}
            </span>
          )}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      {viewingRecord ? (
        renderDetailView()
      ) : (
        <div className="space-y-4">
          {hasNoRecords ? (
            <Empty description="暂无历史抓取记录" />
          ) : (
            <>
              {/* 推荐记录 */}
              {recommendedRecords.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <StarOutlined className="text-warning-500" />
                    <span className="font-medium text-content">推荐使用</span>
                    <span className="text-xs text-content-secondary">
                      未过期且距离当前合作最近
                    </span>
                  </div>
                  {recommendedRecords.map(r =>
                    renderRecordItem(r, 'recommended')
                  )}
                </div>
              )}

              {/* 其他可用记录 */}
              {otherValidRecords.length > 0 && (
                <div>
                  {recommendedRecords.length > 0 && (
                    <Divider className="my-4" />
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <HistoryOutlined className="text-primary-500" />
                    <span className="font-medium text-content">
                      其他可用记录
                    </span>
                    <span className="text-xs text-content-secondary">
                      未过期
                    </span>
                  </div>
                  <div className="space-y-3">
                    {otherValidRecords.map(r => renderRecordItem(r, 'valid'))}
                  </div>
                </div>
              )}

              {/* 已过期记录 */}
              {expiredRecords.length > 0 && (
                <div>
                  {(recommendedRecords.length > 0 ||
                    otherValidRecords.length > 0) && (
                    <Divider className="my-4" />
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <ExclamationCircleOutlined className="text-warning-500" />
                    <span className="font-medium text-content">已过期记录</span>
                    <span className="text-xs text-content-secondary">
                      仅供参考，建议重新抓取
                    </span>
                  </div>
                  <div className="space-y-3">
                    {expiredRecords.map(r => renderRecordItem(r, 'expired'))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 提示信息 */}
          {!hasNoRecords && (
            <div className="mt-4 p-3 bg-info-500/10 border border-info-500/20 rounded-lg">
              <div className="text-sm text-content-secondary">
                <strong>提示：</strong>
                历史数据可直接用于生成飞书表格，无需重新抓取。如果价格信息可能已变化，建议重新抓取获取最新数据。
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
