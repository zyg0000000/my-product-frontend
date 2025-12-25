/**
 * 日报分组创建/编辑弹窗
 *
 * 功能：
 * - 选择多个项目组成分组
 * - 选择主项目（日报标题使用此项目名称）
 * - 可选的分组名称
 * - 校验项目不能重复属于多个分组
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Alert,
  Tag,
  Typography,
} from 'antd';
import { InfoCircleOutlined, StarFilled } from '@ant-design/icons';
import type { DailyReportGroupFormData } from '../../../types/dailyReportGroup';

const { Text } = Typography;

interface GroupCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    formData: DailyReportGroupFormData
  ) => Promise<{ success: boolean; error?: string }>;
  /** 编辑模式时传入的分组数据 */
  editingGroup?: {
    id: string;
    name?: string;
    primaryProjectId: string;
    projectIds: string[];
  } | null;
  /** 可选的项目列表 */
  projects: Array<{
    id: string;
    name: string;
    /** 是否已被其他分组占用 */
    isOccupied?: boolean;
    /** 所属分组名称 */
    occupiedGroupName?: string;
  }>;
}

export function GroupCreateModal({
  open,
  onClose,
  onSave,
  editingGroup,
  projects,
}: GroupCreateModalProps) {
  const [form] = Form.useForm<DailyReportGroupFormData>();
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // 编辑模式：初始化表单
  useEffect(() => {
    if (open && editingGroup) {
      form.setFieldsValue({
        name: editingGroup.name,
        primaryProjectId: editingGroup.primaryProjectId,
        projectIds: editingGroup.projectIds,
      });
      setSelectedProjectIds(editingGroup.projectIds);
    } else if (open) {
      form.resetFields();
      setSelectedProjectIds([]);
    }
    setError(null);
  }, [open, editingGroup, form]);

  // 主项目选项（仅限已选中的项目）
  const primaryProjectOptions = useMemo(() => {
    return projects
      .filter(p => selectedProjectIds.includes(p.id))
      .map(p => ({
        label: p.name,
        value: p.id,
      }));
  }, [projects, selectedProjectIds]);

  // 项目选择选项
  const projectOptions = useMemo(() => {
    return projects.map(p => {
      const isEditing = editingGroup?.projectIds.includes(p.id);
      const isDisabled = p.isOccupied && !isEditing;

      return {
        label: (
          <Space>
            <span>{p.name}</span>
            {p.isOccupied && !isEditing && (
              <Tag color="warning" style={{ marginLeft: 4 }}>
                已在「{p.occupiedGroupName}」中
              </Tag>
            )}
          </Space>
        ),
        value: p.id,
        disabled: isDisabled,
      };
    });
  }, [projects, editingGroup]);

  // 处理项目选择变化
  const handleProjectsChange = (values: string[]) => {
    setSelectedProjectIds(values);

    // 如果当前主项目不在新选择中，清空主项目
    const currentPrimary = form.getFieldValue('primaryProjectId');
    if (currentPrimary && !values.includes(currentPrimary)) {
      form.setFieldValue('primaryProjectId', undefined);
    }

    // 如果只选了一个项目，自动设为主项目
    if (values.length === 1) {
      form.setFieldValue('primaryProjectId', values[0]);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 确保 projectIds 包含 primaryProjectId
      if (!values.projectIds.includes(values.primaryProjectId)) {
        values.projectIds = [values.primaryProjectId, ...values.projectIds];
      }

      const result = await onSave(values);

      if (result.success) {
        form.resetFields();
        setSelectedProjectIds([]);
        setError(null);
        onClose();
      } else {
        setError(result.error || '保存失败');
      }
    } catch (err) {
      // 表单验证失败
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedProjectIds([]);
    setError(null);
    onClose();
  };

  return (
    <Modal
      title={editingGroup ? '编辑日报分组' : '创建日报分组'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={editingGroup ? '保存' : '创建'}
      cancelText="取消"
      width={560}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className="mt-4"
      >
        {error && (
          <Alert
            type="error"
            title={error}
            showIcon
            closable
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        <Form.Item
          name="projectIds"
          label="选择项目"
          rules={[
            { required: true, message: '请选择至少两个项目' },
            {
              validator: (_, value) => {
                if (value && value.length < 2) {
                  return Promise.reject('至少选择两个项目才能创建分组');
                }
                return Promise.resolve();
              },
            },
          ]}
          extra={
            <Text type="secondary" className="text-xs">
              <InfoCircleOutlined className="mr-1" />
              一个项目只能属于一个分组
            </Text>
          }
        >
          <Select
            mode="multiple"
            placeholder="选择要合并的项目"
            options={projectOptions}
            onChange={handleProjectsChange}
            showSearch
            filterOption={(input, option) =>
              String(option?.label)?.toLowerCase().includes(input.toLowerCase())
            }
            maxTagCount={5}
            maxTagPlaceholder={omitted => `+${omitted.length} 个项目`}
          />
        </Form.Item>

        <Form.Item
          name="primaryProjectId"
          label={
            <Space>
              <StarFilled className="text-warning-500" />
              <span>主项目</span>
            </Space>
          }
          rules={[{ required: true, message: '请选择主项目' }]}
          extra={
            <Text type="secondary" className="text-xs">
              日报标题将使用主项目的名称
            </Text>
          }
        >
          <Select
            placeholder="选择主项目"
            options={primaryProjectOptions}
            disabled={selectedProjectIds.length === 0}
            showSearch
            filterOption={(input, option) =>
              String(option?.label)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="分组名称（可选）"
          extra={
            <Text type="secondary" className="text-xs">
              如不填写，将使用主项目名称作为分组名称
            </Text>
          }
        >
          <Input placeholder="输入分组名称" maxLength={50} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default GroupCreateModal;
