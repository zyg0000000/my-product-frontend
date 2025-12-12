/**
 * 合作记录表单弹窗
 * 新建和编辑合作达人记录
 *
 * 设计风格：与项目详情页保持统一
 * - 清晰的分区标题
 * - 统一的标签样式（小号灰色）
 * - 简洁的表单布局
 *
 * 使用 useCollaborationForm hook 封装业务逻辑
 */

import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Spin,
  Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { Collaboration, TalentSource } from '../../../types/project';
import { COLLABORATION_STATUS_OPTIONS } from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { useCollaborationForm } from '../../../hooks/useCollaborationForm';

/**
 * 达人来源选项
 */
const TALENT_SOURCE_OPTIONS: Array<{ label: string; value: TalentSource }> = [
  { label: '机构达人', value: '机构达人' },
  { label: '独立达人', value: '独立达人' },
  { label: '客户指定', value: '客户指定' },
];

/**
 * 分区标题组件
 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 pt-1">
      <div className="w-1 h-4 bg-primary-500 rounded-full" />
      <span className="text-sm font-medium text-content">{children}</span>
    </div>
  );
}

interface CollaborationFormModalProps {
  open: boolean;
  projectId: string;
  platforms: Platform[];
  editingCollaboration: Collaboration | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CollaborationFormModal({
  open,
  projectId,
  platforms,
  editingCollaboration,
  onCancel,
  onSuccess,
}: CollaborationFormModalProps) {
  const [form] = Form.useForm();

  // 使用封装的业务逻辑 hook
  const {
    isEdit,
    talentLoading,
    talentOptions,
    selectedPlatform,
    tooltips,
    loading,
    platformNames,
    searchTalents,
    handleTalentChange,
    setSelectedPlatform,
    initializeForm,
    resetForm,
    handleSubmit,
  } = useCollaborationForm({
    form,
    projectId,
    editingCollaboration,
    onSuccess,
  });

  // 弹窗打开时初始化表单
  useEffect(() => {
    if (open) {
      initializeForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingCollaboration]);

  // 平台筛选选项
  const platformOptions = platforms.map(p => ({
    label: platformNames[p] || p,
    value: p,
  }));

  // 关闭弹窗
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal
      title={
        <span className="text-lg font-semibold text-content">
          {isEdit ? '编辑合作记录' : '添加合作达人'}
        </span>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={680}
      destroyOnHidden
      className="collaboration-form-modal"
      styles={{ body: { padding: '20px 24px' } }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="[&_.ant-form-item-label>label]:text-xs [&_.ant-form-item-label>label]:text-content-secondary [&_.ant-form-item-label>label]:font-normal [&_.ant-form-item]:mb-4"
      >
        {/* 隐藏字段 */}
        <Form.Item name="talentOneId" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="talentPlatform" hidden>
          <Input />
        </Form.Item>

        {/* === 达人信息区域 === */}
        <SectionTitle>达人信息</SectionTitle>
        <div className="bg-surface-base/50 rounded-lg p-4 mb-5">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="talentSelect"
                label="选择达人"
                rules={[{ required: !isEdit, message: '请选择达人' }]}
                className="mb-0"
              >
                <Select
                  placeholder="输入昵称(模糊) 或 ID(精准)搜索"
                  showSearch
                  filterOption={false}
                  onSearch={searchTalents}
                  onChange={handleTalentChange}
                  loading={talentLoading}
                  notFoundContent={
                    talentLoading ? (
                      <Spin size="small" />
                    ) : (
                      '输入昵称或平台ID搜索达人'
                    )
                  }
                  options={talentOptions}
                  disabled={isEdit}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="talentSource" label="达人来源" className="mb-0">
                <Select
                  placeholder="选择来源"
                  options={TALENT_SOURCE_OPTIONS}
                  disabled={isEdit}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 平台筛选（可选，用于缩小搜索范围） */}
          {!isEdit && platforms.length > 1 && (
            <Row gutter={16} className="mt-4">
              <Col span={12}>
                <Form.Item label="平台筛选" className="mb-0">
                  <Select
                    placeholder="全部平台"
                    allowClear
                    options={platformOptions}
                    value={selectedPlatform || undefined}
                    onChange={v => setSelectedPlatform(v || '')}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
        </div>

        {/* === 执行信息区域 === */}
        <SectionTitle>执行信息</SectionTitle>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="amount"
              label={
                <span className="inline-flex items-center gap-1">
                  执行金额（元）
                  {tooltips.price && (
                    <Tooltip title={tooltips.price}>
                      <InfoCircleOutlined className="text-content-muted cursor-help" />
                    </Tooltip>
                  )}
                </span>
              }
              rules={[
                { required: true, message: '请输入执行金额' },
                { type: 'number', min: 0, message: '金额不能为负数' },
              ]}
            >
              <InputNumber
                placeholder="输入金额"
                style={{ width: '100%' }}
                formatter={value =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={value => value?.replace(/,/g, '') as unknown as number}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="rebateRate"
              label={
                <span className="inline-flex items-center gap-1">
                  返点率（%）
                  {tooltips.rebate && (
                    <Tooltip
                      title={
                        <span style={{ whiteSpace: 'pre-line' }}>
                          {tooltips.rebate}
                        </span>
                      }
                    >
                      <InfoCircleOutlined className="text-content-muted cursor-help" />
                    </Tooltip>
                  )}
                </span>
              }
            >
              <InputNumber
                placeholder="例如 30"
                style={{ width: '100%' }}
                min={0}
                max={100}
                precision={1}
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="执行状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select
                placeholder="选择状态"
                options={COLLABORATION_STATUS_OPTIONS.map(s => ({
                  label: s,
                  value: s,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

export default CollaborationFormModal;
