/**
 * 合作记录表单弹窗
 * 新建和编辑合作达人记录
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Spin,
  Divider,
  App,
} from 'antd';
import dayjs from 'dayjs';
import type {
  Collaboration,
  CreateCollaborationRequest,
  TalentSource,
} from '../../../types/project';
import {
  COLLABORATION_STATUS_OPTIONS,
  yuanToCents,
  centsToYuan,
} from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { talentApi, type TalentListItem } from '../../../services/talentApi';
import { logger } from '../../../utils/logger';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';

interface CollaborationFormModalProps {
  open: boolean;
  projectId: string;
  platforms: Platform[];
  editingCollaboration: Collaboration | null;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 达人来源选项
 */
const TALENT_SOURCE_OPTIONS: Array<{ label: string; value: TalentSource }> = [
  { label: '机构达人', value: '机构达人' },
  { label: '独立达人', value: '独立达人' },
  { label: '客户指定', value: '客户指定' },
];

export function CollaborationFormModal({
  open,
  projectId,
  platforms,
  editingCollaboration,
  onCancel,
  onSuccess,
}: CollaborationFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 平台配置
  const { getPlatformNames } = usePlatformConfig();
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);

  // 达人搜索状态
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentOptions, setTalentOptions] = useState<
    Array<{ value: string; label: string; platform: Platform }>
  >([]);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | ''>('');

  const isEdit = !!editingCollaboration;

  /**
   * 搜索达人
   */
  const searchTalents = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setTalentOptions([]);
        return;
      }

      try {
        setTalentLoading(true);
        const response = await talentApi.getTalents({
          page: 1,
          pageSize: 30,
          keyword: searchTerm,
          platform: selectedPlatform || undefined,
        });

        if (response.success) {
          const options = response.data.items.map((t: TalentListItem) => ({
            value: `${t.oneId}__${t.platform}`,
            label: `${t.nickname || t.oneId} (${platformNames[t.platform] || t.platform})`,
            platform: t.platform,
          }));
          setTalentOptions(options);
        }
      } catch (error) {
        logger.error('Error searching talents:', error);
      } finally {
        setTalentLoading(false);
      }
    },
    [selectedPlatform]
  );

  /**
   * 达人选择变化
   */
  const handleTalentChange = (value: string) => {
    const [oneId, platform] = value.split('__');
    form.setFieldsValue({
      talentOneId: oneId,
      talentPlatform: platform,
    });
    setSelectedPlatform(platform as Platform);
  };

  /**
   * 初始化表单
   */
  useEffect(() => {
    if (open) {
      if (editingCollaboration) {
        // 编辑模式：填充数据
        form.setFieldsValue({
          talentSelect: `${editingCollaboration.talentOneId}__${editingCollaboration.talentPlatform}`,
          talentOneId: editingCollaboration.talentOneId,
          talentPlatform: editingCollaboration.talentPlatform,
          talentSource: editingCollaboration.talentSource,
          status: editingCollaboration.status,
          amount: centsToYuan(editingCollaboration.amount),
          rebateRate: editingCollaboration.rebateRate,
          priceInfo: editingCollaboration.priceInfo,
          plannedReleaseDate: editingCollaboration.plannedReleaseDate
            ? dayjs(editingCollaboration.plannedReleaseDate)
            : undefined,
          actualReleaseDate: editingCollaboration.actualReleaseDate
            ? dayjs(editingCollaboration.actualReleaseDate)
            : undefined,
          taskId: editingCollaboration.taskId,
          videoId: editingCollaboration.videoId,
          videoUrl: editingCollaboration.videoUrl,
        });

        // 设置达人选项
        setTalentOptions([
          {
            value: `${editingCollaboration.talentOneId}__${editingCollaboration.talentPlatform}`,
            label: `${editingCollaboration.talentName || editingCollaboration.talentOneId} (${platformNames[editingCollaboration.talentPlatform] || editingCollaboration.talentPlatform})`,
            platform: editingCollaboration.talentPlatform,
          },
        ]);
        setSelectedPlatform(editingCollaboration.talentPlatform);
      } else {
        // 新建模式：设置默认值
        form.setFieldsValue({
          status: '待提报工作台',
          talentSource: '机构达人',
        });
        setTalentOptions([]);
        setSelectedPlatform('');
      }
    }
  }, [open, editingCollaboration, form]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit && editingCollaboration) {
        // 更新
        const response = await projectApi.updateCollaboration(
          editingCollaboration.id,
          {
            status: values.status,
            amount: yuanToCents(values.amount),
            plannedReleaseDate: values.plannedReleaseDate
              ? values.plannedReleaseDate.format('YYYY-MM-DD')
              : undefined,
            actualReleaseDate: values.actualReleaseDate
              ? values.actualReleaseDate.format('YYYY-MM-DD')
              : undefined,
            taskId: values.taskId,
            videoId: values.videoId,
            videoUrl: values.videoUrl,
          }
        );

        if (response.success) {
          message.success('更新成功');
          form.resetFields();
          onSuccess();
        } else {
          message.error(response.message || '更新失败');
        }
      } else {
        // 创建
        const data: CreateCollaborationRequest = {
          projectId,
          talentOneId: values.talentOneId,
          talentPlatform: values.talentPlatform,
          amount: yuanToCents(values.amount),
          plannedReleaseDate: values.plannedReleaseDate
            ? values.plannedReleaseDate.format('YYYY-MM-DD')
            : undefined,
          rebateRate: values.rebateRate,
          talentSource: values.talentSource,
        };

        const response = await projectApi.createCollaboration(data);

        if (response.success) {
          message.success('添加成功');
          form.resetFields();
          onSuccess();
        } else {
          message.error(response.message || '添加失败');
        }
      }
    } catch (error) {
      logger.error('Form submit error:', error);
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 关闭弹窗
   */
  const handleCancel = () => {
    form.resetFields();
    setTalentOptions([]);
    setSelectedPlatform('');
    onCancel();
  };

  /**
   * 平台筛选选项
   */
  const platformOptions = platforms.map(p => ({
    label: platformNames[p] || p,
    value: p,
  }));

  return (
    <Modal
      title={isEdit ? '编辑合作记录' : '添加合作达人'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
        requiredMark="optional"
      >
        {/* 达人选择（新建时可选，编辑时只读） */}
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="talentSelect"
              label="选择达人"
              rules={[{ required: !isEdit, message: '请选择达人' }]}
            >
              <Select
                placeholder="输入达人昵称或 ID 搜索"
                showSearch
                filterOption={false}
                onSearch={searchTalents}
                onChange={handleTalentChange}
                loading={talentLoading}
                notFoundContent={
                  talentLoading ? <Spin size="small" /> : '输入关键词搜索达人'
                }
                options={talentOptions}
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="talentSource" label="达人来源">
              <Select
                placeholder="选择来源"
                options={TALENT_SOURCE_OPTIONS}
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 隐藏字段 */}
        <Form.Item name="talentOneId" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="talentPlatform" hidden>
          <Input />
        </Form.Item>

        {/* 平台筛选（可选，用于缩小搜索范围） */}
        {!isEdit && platforms.length > 1 && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="平台筛选（可选）">
                <Select
                  placeholder="不限"
                  allowClear
                  options={platformOptions}
                  value={selectedPlatform || undefined}
                  onChange={v => setSelectedPlatform(v || '')}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Divider className="my-4" />

        {/* 执行信息 */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="amount"
              label="执行金额（元）"
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
            <Form.Item name="rebateRate" label="返点率（%）">
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
              label="状态"
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

        {/* 发布日期 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="plannedReleaseDate" label="计划发布日期">
              <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="actualReleaseDate" label="实际发布日期">
              <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
            </Form.Item>
          </Col>
        </Row>

        {/* 任务和视频信息（编辑时显示） */}
        {isEdit && (
          <>
            <Divider className="my-4" />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="taskId" label="星图任务 ID">
                  <Input placeholder="可选" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="videoId" label="视频 ID">
                  <Input placeholder="可选" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="videoUrl" label="视频链接">
                  <Input placeholder="https://..." />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
}

export default CollaborationFormModal;
