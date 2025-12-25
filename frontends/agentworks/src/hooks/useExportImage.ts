/**
 * 导出图片 Hook
 * 使用 html-to-image 将 DOM 元素导出为 PNG 图片
 */

import { useState, useCallback, RefObject } from 'react';
import { toPng } from 'html-to-image';
import { message } from 'antd';

interface UseExportImageOptions {
  /** 文件名（不含扩展名） */
  filename?: string;
  /** 图片质量 0-1 */
  quality?: number;
  /** 背景色 */
  backgroundColor?: string;
  /** 像素比例 */
  pixelRatio?: number;
}

interface UseExportImageReturn {
  /** 是否正在导出 */
  exporting: boolean;
  /** 导出图片 */
  exportImage: () => Promise<void>;
}

/**
 * 导出图片 Hook
 * @param ref - 要导出的 DOM 元素引用
 * @param options - 导出选项
 */
export function useExportImage(
  ref: RefObject<HTMLElement>,
  options: UseExportImageOptions = {}
): UseExportImageReturn {
  const {
    filename = 'export',
    quality = 1,
    backgroundColor = '#ffffff',
    pixelRatio = 2,
  } = options;

  const [exporting, setExporting] = useState(false);

  const exportImage = useCallback(async () => {
    if (!ref.current) {
      message.error('导出区域未找到');
      return;
    }

    setExporting(true);

    try {
      const dataUrl = await toPng(ref.current, {
        quality,
        backgroundColor,
        pixelRatio,
        // 过滤掉按钮等不需要导出的元素
        filter: node => {
          // 过滤掉带有 data-export-ignore 属性的元素
          if (
            node instanceof HTMLElement &&
            node.dataset.exportIgnore === 'true'
          ) {
            return false;
          }
          return true;
        },
      });

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();

      message.success('图片导出成功');
    } catch (error) {
      console.error('导出图片失败:', error);
      message.error('导出图片失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [ref, filename, quality, backgroundColor, pixelRatio]);

  return {
    exporting,
    exportImage,
  };
}
