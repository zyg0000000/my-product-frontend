/**
 * 生成飞书报名表弹窗组件
 *
 * 功能：
 * - 选择报告模板
 * - 输入表格名称
 * - 输入目标文件夹 Token（可选）
 * - 展示已选达人列表
 * - 调用云函数生成飞书表格
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, List, Button, Spin, App } from 'antd';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  UserOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { registrationApi } from '../../../../api/registration';
import type {
  RegistrationTalentItem,
  ReportTemplateOption,
} from '../../../../types/registration';

interface GenerateSheetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  projectName: string;
  selectedTalents: RegistrationTalentItem[];
}

export function GenerateSheetModal({
  open,
  onClose,
  onSuccess,
  projectId,
  projectName,
  selectedTalents,
}: GenerateSheetModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  // 状态
  const [templates, setTemplates] = useState<ReportTemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 默认表格名称
  const defaultSheetName = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return `${projectName} - 报名表 - ${today}`;
  }, [projectName]);

  // 加载模板列表
  useEffect(() => {
    if (open) {
      loadTemplates();
      // 重置表单
      form.setFieldsValue({
        sheetName: defaultSheetName,
        templateId: undefined,
        destinationFolderToken: '',
      });
    }
  }, [open, form, defaultSheetName]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await registrationApi.getReportTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        console.warn('加载模板失败:', result.message);
      }
    } catch (error) {
      console.error('加载模板出错:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 生成表格
  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();

      if (!values.templateId) {
        message.warning('请选择报告模板');
        return;
      }

      if (!values.sheetName?.trim()) {
        message.warning('请输入表格名称');
        return;
      }

      const selectedTemplate = templates.find(t => t.id === values.templateId);
      if (!selectedTemplate) {
        message.error('模板不存在');
        return;
      }

      setGenerating(true);

      const result = await registrationApi.generateRegistrationSheet({
        projectId,
        templateId: values.templateId,
        templateName: selectedTemplate.name,
        sheetName: values.sheetName.trim(),
        collaborationIds: selectedTalents.map(t => t.collaborationId),
        destinationFolderToken:
          values.destinationFolderToken?.trim() || undefined,
      });

      if (result.success && result.data) {
        message.success('飞书表格生成成功！');

        // 打开生成的表格
        if (result.data.sheetUrl) {
          window.open(result.data.sheetUrl, '_blank');
        }

        onSuccess();
      } else {
        throw new Error(result.message || '生成失败');
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error('生成失败: ' + error.message);
      }
      console.error('生成表格错误:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      title="生成飞书报名表"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={generating}>
          取消
        </Button>,
        <Button
          key="generate"
          type="primary"
          icon={<ExportOutlined />}
          loading={generating}
          onClick={handleGenerate}
        >
          生成表格
        </Button>,
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        {/* 1. 选择报告模板 */}
        <Form.Item
          name="templateId"
          label={
            <span className="flex items-center gap-1">
              <FileTextOutlined />
              选择报告模板
            </span>
          }
          rules={[{ required: true, message: '请选择报告模板' }]}
        >
          <Select
            placeholder="请选择报告模板"
            loading={loadingTemplates}
            notFoundContent={
              loadingTemplates ? <Spin size="small" /> : '暂无可用模板'
            }
            options={templates.map(t => ({
              label: t.name,
              value: t.id,
            }))}
          />
        </Form.Item>

        {/* 2. 表格名称 */}
        <Form.Item
          name="sheetName"
          label={
            <span className="flex items-center gap-1">
              <FileTextOutlined />
              表格名称
            </span>
          }
          rules={[{ required: true, message: '请输入表格名称' }]}
        >
          <Input placeholder="请输入生成的表格名称" />
        </Form.Item>

        {/* 3. 保存位置（可选） */}
        <Form.Item
          name="destinationFolderToken"
          label={
            <span className="flex items-center gap-1">
              <FolderOpenOutlined />
              保存位置（可选）
            </span>
          }
          extra="粘贴飞书文件夹 URL 或 Token，留空则保存在模板所在文件夹"
        >
          <Input placeholder="https://xxx.feishu.cn/folder/xxx 或 folder_token" />
        </Form.Item>

        {/* 4. 已选达人列表 */}
        <Form.Item
          label={
            <span className="flex items-center gap-1">
              <UserOutlined />
              已选达人 ({selectedTalents.length}人)
            </span>
          }
        >
          <div className="max-h-48 overflow-y-auto border border-stroke rounded-lg">
            <List
              size="small"
              dataSource={selectedTalents}
              renderItem={talent => (
                <List.Item className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-success-500">✓</span>
                    <span>{talent.talentName}</span>
                    {talent.xingtuId && (
                      <span className="text-content-muted text-xs">
                        (星图ID: {talent.xingtuId})
                      </span>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
