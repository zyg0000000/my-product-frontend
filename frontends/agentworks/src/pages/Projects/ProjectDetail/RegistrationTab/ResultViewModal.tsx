/**
 * 抓取结果查看弹窗
 *
 * 优化版本 - 统一 AgentWorks 风格
 * - 截图网格布局 + 点击放大预览
 * - 提取数据友好展示
 * - 深色/浅色主题支持（使用语义化 CSS Variables）
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Empty, Tag } from 'antd';
import {
  PictureOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { RegistrationTalentItem } from '../../../../types/registration';

interface ResultViewModalProps {
  open: boolean;
  talent: RegistrationTalentItem | null;
  onClose: () => void;
}

type TabKey = 'screenshots' | 'data';

export function ResultViewModal({
  open,
  talent,
  onClose,
}: ResultViewModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('screenshots');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 提取数据，确保 hooks 总是以相同顺序调用
  const result = talent?.result;
  const screenshots = result?.screenshots ?? [];
  const extractedData = result?.extractedData ?? {};
  const status = result?.status;

  // 预览导航
  const handlePrevImage = useCallback(() => {
    setPreviewIndex(prev => (prev > 0 ? prev - 1 : screenshots.length - 1));
  }, [screenshots.length]);

  const handleNextImage = useCallback(() => {
    setPreviewIndex(prev => (prev < screenshots.length - 1 ? prev + 1 : 0));
  }, [screenshots.length]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!previewVisible) return;

      switch (e.key) {
        case 'Escape':
          setPreviewVisible(false);
          break;
        case 'ArrowLeft':
          handlePrevImage();
          break;
        case 'ArrowRight':
          handleNextImage();
          break;
      }
    },
    [previewVisible, handlePrevImage, handleNextImage]
  );

  // 注册键盘事件
  useEffect(() => {
    if (previewVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [previewVisible, handleKeyDown]);

  // 渲染提取数据
  const renderExtractedData = useMemo(() => {
    const entries = Object.entries(extractedData);
    if (entries.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-content-muted">暂无提取数据</span>}
        />
      );
    }

    return (
      <div className="grid gap-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="bg-surface-sunken rounded-lg p-4 border border-stroke transition-colors hover:border-primary-300"
          >
            <div className="text-xs text-content-muted uppercase tracking-wide mb-1.5 font-medium">
              {key}
            </div>
            <div className="text-content text-sm">
              {typeof value === 'object' ? (
                <pre className="font-mono text-xs bg-surface rounded p-3 overflow-x-auto border border-stroke whitespace-pre-wrap break-words text-content">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <span className="font-medium">{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [extractedData]);

  const handleImageClick = (index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  };

  // 早期返回必须在所有 hooks 之后
  if (!talent || !result) {
    return null;
  }

  return (
    <>
      <Modal
        title={null}
        open={open}
        onCancel={onClose}
        footer={null}
        width={920}
        destroyOnHidden
        closable={false}
        className="result-view-modal"
        styles={{
          body: { padding: 0 },
          content: {
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--color-border)',
          },
          header: { display: 'none' },
          mask: { backdropFilter: 'blur(4px)' },
        }}
      >
        {/* 自定义头部 - 深色渐变背景确保文字可见 */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-6 py-5 text-white relative rounded-t-2xl">
          {/* 关闭按钮 - 增强可见性 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors border border-white/20"
          >
            <CloseOutlined className="text-white" />
          </button>

          <div className="flex items-center justify-between pr-10">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-white drop-shadow-sm">
                {talent.talentName}
                <Tag
                  color={status === 'success' ? '#10b981' : '#ef4444'}
                  className="text-xs font-medium"
                  style={{ color: 'white', border: 'none' }}
                >
                  {status === 'success' ? (
                    <>
                      <CheckCircleOutlined className="mr-1" />
                      成功
                    </>
                  ) : (
                    <>
                      <CloseCircleOutlined className="mr-1" />
                      失败
                    </>
                  )}
                </Tag>
              </h2>
              <div className="text-white/90 text-sm flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5">
                  <LinkOutlined />
                  {result.workflowName}
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockCircleOutlined />
                  {new Date(result.fetchedAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/80 text-xs font-medium">星图 ID</div>
              <div className="font-mono text-sm text-white font-medium">
                {result.xingtuId}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="border-b border-stroke bg-surface">
          <div className="flex">
            <button
              onClick={() => setActiveTab('screenshots')}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all
                border-b-2 -mb-px
                ${
                  activeTab === 'screenshots'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-content-muted hover:text-content-secondary hover:border-stroke'
                }
              `}
            >
              <PictureOutlined />
              截图
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-surface-sunken text-content-secondary">
                {screenshots.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all
                border-b-2 -mb-px
                ${
                  activeTab === 'data'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-content-muted hover:text-content-secondary hover:border-stroke'
                }
              `}
            >
              <FileTextOutlined />
              提取数据
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-surface-sunken text-content-secondary">
                {Object.keys(extractedData).length}
              </span>
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-6 bg-surface max-h-[60vh] overflow-y-auto">
          {activeTab === 'screenshots' && (
            <div className="space-y-4">
              {screenshots.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-content-muted">暂无截图</span>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.map((screenshot, index) => (
                    <div
                      key={index}
                      onClick={() => handleImageClick(index)}
                      className="
                        group relative cursor-pointer
                        rounded-xl overflow-hidden
                        border border-stroke
                        bg-surface-sunken
                        transition-all duration-200
                        hover:border-primary-400 hover:shadow-lg hover:shadow-primary-500/10
                      "
                    >
                      {/* 图片容器 - 固定宽高比 */}
                      <div className="aspect-[16/10] relative overflow-hidden bg-surface-sunken">
                        <img
                          src={screenshot.url}
                          alt={screenshot.name}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        {/* 悬浮遮罩 */}
                        <div
                          className="
                          absolute inset-0 bg-black/0 group-hover:bg-black/30
                          flex items-center justify-center
                          transition-all duration-200
                        "
                        >
                          <div
                            className="
                            opacity-0 group-hover:opacity-100
                            transform scale-75 group-hover:scale-100
                            transition-all duration-200
                            bg-surface/90 backdrop-blur-sm rounded-full p-3
                          "
                          >
                            <ZoomInOutlined className="text-xl text-content" />
                          </div>
                        </div>
                      </div>
                      {/* 图片名称 */}
                      <div
                        className="
                        px-4 py-3
                        bg-surface border-t border-stroke
                        text-sm text-content-secondary
                        truncate
                        group-hover:text-primary-600
                        transition-colors
                      "
                      >
                        {screenshot.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && renderExtractedData}
        </div>
      </Modal>

      {/* 全屏图片预览 */}
      {previewVisible && screenshots.length > 0 && (
        <div
          className="fixed inset-0 z-[1100] bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewVisible(false)}
        >
          {/* 导航按钮 - 左 */}
          {screenshots.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                handlePrevImage();
              }}
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                w-12 h-12 rounded-full
                bg-white/10 hover:bg-white/20
                flex items-center justify-center
                text-white text-xl
                transition-all duration-200
                backdrop-blur-sm
              "
            >
              <LeftOutlined />
            </button>
          )}

          {/* 图片 */}
          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={screenshots[previewIndex].url}
              alt={screenshots[previewIndex].name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {/* 图片信息 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg">
              <div className="text-white font-medium">
                {screenshots[previewIndex].name}
              </div>
              <div className="text-white/60 text-sm mt-1">
                {previewIndex + 1} / {screenshots.length}
              </div>
            </div>
          </div>

          {/* 导航按钮 - 右 */}
          {screenshots.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="
                absolute right-4 top-1/2 -translate-y-1/2
                w-12 h-12 rounded-full
                bg-white/10 hover:bg-white/20
                flex items-center justify-center
                text-white text-xl
                transition-all duration-200
                backdrop-blur-sm
              "
            >
              <RightOutlined />
            </button>
          )}

          {/* 关闭提示 */}
          <div className="absolute top-4 right-4 text-white/50 text-sm">
            按 ESC 或点击任意处关闭
          </div>

          {/* 缩略图列表 */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={e => {
                    e.stopPropagation();
                    setPreviewIndex(index);
                  }}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all
                    ${
                      index === previewIndex
                        ? 'bg-white scale-125'
                        : 'bg-white/40 hover:bg-white/60'
                    }
                  `}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
