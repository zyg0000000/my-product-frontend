/**
 * 项目表单弹窗
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Row,
  Col,
  Spin,
  App,
} from 'antd';
import type {
  ProjectListItem,
  CreateProjectRequest,
} from '../../../types/project';
import {
  PROJECT_STATUS_OPTIONS,
  yuanToCents,
  centsToYuan,
} from '../../../types/project';
import { PLATFORM_NAMES, type Platform } from '../../../types/talent';
import { projectApi } from '../../../services/projectApi';
import { customerApi } from '../../../services/customerApi';
import { logger } from '../../../utils/logger';

/**
 * 客户选项
 */
interface CustomerOption {
  value: string;
  label: string;
  projectTypes?: Array<{ id: string; name: string; isDefault?: boolean }>;
}

interface ProjectFormModalProps {
  open: boolean;
  editingProject: ProjectListItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 平台选项
 */
const PLATFORM_OPTIONS: Array<{ label: string; value: Platform }> = [
  { label: PLATFORM_NAMES.douyin, value: 'douyin' },
  { label: PLATFORM_NAMES.xiaohongshu, value: 'xiaohongshu' },
  { label: PLATFORM_NAMES.bilibili, value: 'bilibili' },
  { label: PLATFORM_NAMES.kuaishou, value: 'kuaishou' },
];

/**
 * 生成年份选项
 */
const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [];
  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    options.push({ label: `${y}年`, value: y });
  }
  return options;
};

/**
 * 生成月份选项
 */
const getMonthOptions = () => {
  const options = [];
  for (let m = 1; m <= 12; m++) {
    options.push({ label: `${m}月`, value: m });
  }
  return options;
};

export function ProjectFormModal({
  open,
  editingProject,
  onCancel,
  onSuccess,
}: ProjectFormModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [projectTypeOptions, setProjectTypeOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  const isEdit = !!editingProject;

  /**
   * 加载客户列表
   */
  const loadCustomers = useCallback(async (searchTerm?: string) => {
    try {
      setCustomerLoading(true);
      const response = await customerApi.getCustomers({
        page: 1,
        pageSize: 50,
        searchTerm,
        status: 'active',
      });

      if (response.success) {
        const options: CustomerOption[] = response.data.customers.map(c => ({
          value: c.code,
          label: c.name,
          // TODO: 项目类型系统待优化 - 从客户 businessStrategies 读取
          projectTypes: [
            { id: 'regular', name: '常规投放', isDefault: true },
            { id: 'seckill', name: '常规秒杀' },
            { id: 'brand', name: '品牌合作' },
          ],
        }));
        setCustomerOptions(options);
      }
    } catch (error) {
      logger.error('Error loading customers:', error);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  /**
   * 客户选择变化时更新项目类型选项
   */
  const handleCustomerChange = (customerId: string) => {
    const customer = customerOptions.find(c => c.value === customerId);
    if (customer?.projectTypes) {
      const types = customer.projectTypes.map(t => ({
        label: t.name,
        value: t.name,
      }));
      setProjectTypeOptions(types);

      // 自动选择默认类型
      const defaultType = customer.projectTypes.find(t => t.isDefault);
      if (defaultType && !form.getFieldValue('type')) {
        form.setFieldValue('type', defaultType.name);
      }
    } else {
      setProjectTypeOptions([]);
    }
  };

  /**
   * 初始化表单
   */
  useEffect(() => {
    if (open) {
      loadCustomers();

      if (editingProject) {
        // 编辑模式：填充数据
        form.setFieldsValue({
          name: editingProject.name,
          customerId: editingProject.customerId,
          type: editingProject.type,
          status: editingProject.status,
          platforms: editingProject.platforms,
          year: editingProject.year,
          month: editingProject.month,
          budget: centsToYuan(editingProject.budget),
        });

        // 加载客户的项目类型
        setTimeout(() => {
          handleCustomerChange(editingProject.customerId);
        }, 100);
      } else {
        // 新建模式：设置默认值
        const now = new Date();
        form.setFieldsValue({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          platforms: ['douyin'],
          status: '执行中',
        });
        setProjectTypeOptions([]);
      }
    }
  }, [open, editingProject, form, loadCustomers]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 转换预算为分
      const data: CreateProjectRequest = {
        name: values.name,
        customerId: values.customerId,
        type: values.type,
        platforms: values.platforms,
        year: values.year,
        month: values.month,
        budget: yuanToCents(values.budget),
        discount: values.discount ? values.discount / 100 : undefined,
        benchmarkCPM: values.benchmarkCPM,
        qianchuanId: values.qianchuanId,
      };

      let response;
      if (isEdit && editingProject) {
        response = await projectApi.updateProject(editingProject.id, {
          name: data.name,
          type: data.type,
          status: values.status,
          platforms: data.platforms,
          budget: data.budget,
          discount: data.discount,
          benchmarkCPM: data.benchmarkCPM,
          qianchuanId: data.qianchuanId,
        });
      } else {
        response = await projectApi.createProject(data);
      }

      if (response.success) {
        message.success(isEdit ? '更新成功' : '创建成功');
        form.resetFields();
        onSuccess();
      } else {
        message.error(response.message || '操作失败');
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
    setProjectTypeOptions([]);
    onCancel();
  };

  return (
    <Modal
      title={isEdit ? '编辑项目' : '新建项目'}
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
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="项目名称"
              rules={[
                { required: true, message: '请输入项目名称' },
                { max: 100, message: '项目名称不能超过100字符' },
              ]}
            >
              <Input placeholder="例如：25年M12抖音+小红书联合投放" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="customerId"
              label="客户"
              rules={[{ required: true, message: '请选择客户' }]}
            >
              <Select
                placeholder="请选择客户"
                showSearch
                filterOption={false}
                onSearch={loadCustomers}
                onChange={handleCustomerChange}
                loading={customerLoading}
                notFoundContent={
                  customerLoading ? <Spin size="small" /> : '暂无数据'
                }
                options={customerOptions}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label="项目类型"
              rules={[{ required: true, message: '请选择项目类型' }]}
            >
              <Select
                placeholder="请先选择客户"
                options={projectTypeOptions}
                disabled={projectTypeOptions.length === 0}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="platforms"
              label="投放平台"
              rules={[
                { required: true, message: '请选择至少一个投放平台' },
                {
                  type: 'array',
                  min: 1,
                  message: '请选择至少一个投放平台',
                },
              ]}
            >
              <Checkbox.Group options={PLATFORM_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="year"
              label="年份"
              rules={[{ required: true, message: '请选择年份' }]}
            >
              <Select placeholder="选择年份" options={getYearOptions()} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="month"
              label="月份"
              rules={[{ required: true, message: '请选择月份' }]}
            >
              <Select placeholder="选择月份" options={getMonthOptions()} />
            </Form.Item>
          </Col>
          {isEdit && (
            <Col span={8}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select
                  placeholder="选择状态"
                  options={PROJECT_STATUS_OPTIONS.map(s => ({
                    label: s,
                    value: s,
                  }))}
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="budget"
              label="预算（元）"
              rules={[
                { required: true, message: '请输入项目预算' },
                { type: 'number', min: 0, message: '预算不能为负数' },
              ]}
            >
              <InputNumber
                placeholder="输入预算"
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
              name="discount"
              label="折扣率（%）"
              tooltip="例如：79.5% 输入 79.5"
            >
              <InputNumber
                placeholder="例如 79.5"
                style={{ width: '100%' }}
                min={0}
                max={100}
                precision={2}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="benchmarkCPM" label="基准CPM">
              <InputNumber
                placeholder="输入CPM"
                style={{ width: '100%' }}
                min={0}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="qianchuanId" label="千川ID">
              <Input placeholder="可选" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

export default ProjectFormModal;
