/**
 * 导入 Excel 弹窗
 */

import { useState, useCallback } from 'react';
import { Modal, Upload, Input, Alert, Spin, Tooltip } from 'antd';
import {
  InboxOutlined,
  FileExcelOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Link } from 'react-router-dom';
import { useExcelParser } from '../hooks';
import type { ParsedExcelRecord } from '../types';

const { Dragger } = Upload;
const { TextArea } = Input;

interface ImportExcelModalProps {
  open: boolean;
  importing: boolean;
  onImport: (
    records: ParsedExcelRecord[],
    fileName: string,
    note?: string
  ) => Promise<boolean>;
  onCancel: () => void;
}

export function ImportExcelModal({
  open,
  importing,
  onImport,
  onCancel,
}: ImportExcelModalProps) {
  const [note, setNote] = useState('');
  const {
    records,
    fileName,
    parsing,
    configLoading,
    config,
    error,
    parseFile,
    clear,
  } = useExcelParser();

  // 处理文件上传
  const handleUpload: UploadProps['customRequest'] = useCallback(
    async (
      options: Parameters<NonNullable<UploadProps['customRequest']>>[0]
    ) => {
      const file = options.file as File;
      await parseFile(file);
      options.onSuccess?.(null);
    },
    [parseFile]
  );

  // 处理确认导入
  const handleOk = useCallback(async () => {
    if (records.length === 0 || !fileName) return;
    const success = await onImport(records, fileName, note || undefined);
    if (success) {
      clear();
      setNote('');
      onCancel();
    }
  }, [records, fileName, note, onImport, clear, onCancel]);

  // 处理取消
  const handleCancel = useCallback(() => {
    clear();
    setNote('');
    onCancel();
  }, [clear, onCancel]);

  // 处理移除文件
  const handleRemove = useCallback(() => {
    clear();
    return true;
  }, [clear]);

  // 文件列表
  const fileList: UploadFile[] = fileName
    ? [
        {
          uid: '-1',
          name: fileName,
          status: parsing ? 'uploading' : error ? 'error' : 'done',
        },
      ]
    : [];

  // 显示加载中
  if (configLoading) {
    return (
      <Modal
        title="导入公司返点库"
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={560}
      >
        <div className="flex items-center justify-center py-12">
          <Spin tip="加载配置中..." />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="导入公司返点库"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认导入"
      cancelText="取消"
      okButtonProps={{
        disabled: records.length === 0 || parsing,
        loading: importing,
      }}
      width={560}
      destroyOnClose
    >
      <div className="space-y-4">
        {/* 上传区域 */}
        <Dragger
          accept=".xlsx,.xls"
          multiple={false}
          customRequest={handleUpload}
          fileList={fileList}
          onRemove={handleRemove}
          showUploadList={{
            showPreviewIcon: false,
            showDownloadIcon: false,
          }}
        >
          <p className="ant-upload-drag-icon">
            {parsing ? <Spin /> : <InboxOutlined />}
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式</p>
        </Dragger>

        {/* 错误提示 */}
        {error && (
          <Alert type="error" message="解析失败" description={error} showIcon />
        )}

        {/* 解析成功提示 */}
        {records.length > 0 && !error && (
          <Alert
            type="success"
            message="解析成功"
            description={
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileExcelOutlined />
                  <span>{fileName}</span>
                </div>
                <div className="text-content-secondary">
                  共解析{' '}
                  <span className="font-medium text-content">
                    {records.length.toLocaleString()}
                  </span>{' '}
                  条有效记录
                </div>
              </div>
            }
            showIcon
          />
        )}

        {/* 备注输入 */}
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-2">
            备注（可选）
          </label>
          <TextArea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例如：2025年12月更新"
            rows={2}
            maxLength={200}
            showCount
          />
        </div>

        {/* 当前配置说明 */}
        <div className="text-xs text-content-muted bg-surface-sunken rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">当前解析配置：</span>
            <Tooltip title="修改配置">
              <Link
                to="/settings/company-rebate-import"
                className="text-primary-600 hover:text-primary-700"
                onClick={handleCancel}
              >
                <SettingOutlined />
              </Link>
            </Tooltip>
          </div>
          {config?.columnMapping && config?.rebateParser ? (
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                星图ID列：
                <code className="bg-surface px-1 rounded">
                  {config.columnMapping.xingtuId || '星图ID'}
                </code>
              </li>
              <li>
                返点列：
                <code className="bg-surface px-1 rounded">
                  {config.columnMapping.rebate || '备注'}
                </code>
              </li>
              <li>
                解析模式：
                <code className="bg-surface px-1 rounded">
                  {config.rebateParser.type === 'direct'
                    ? '直接数值'
                    : config.rebateParser.type === 'regex'
                      ? '正则匹配'
                      : '百分比格式'}
                </code>
              </li>
            </ul>
          ) : (
            <p className="text-content-muted">使用默认配置</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
