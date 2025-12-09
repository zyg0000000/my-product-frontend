/**
 * 项目表单弹窗 (v4.5)
 *
 * v4.5 改造：
 * - 移除状态选择器（新建时默认状态）
 * - 移除千川ID字段
 * - 折扣率在 framework 模式下只读
 * - 添加 KPI 配置区域（从客户配置继承）
 * - 存储定价模式快照
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Card,
  Tag,
  Tooltip,
  Switch,
  Space,
} from 'antd';
import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons';
import type {
  ProjectListItem,
  CreateProjectRequest,
  PlatformDiscounts,
  PlatformPricingModes,
  PlatformQuotationCoefficients,
  ProjectKPIConfigs,
} from '../../../types/project';
import { yuanToCents, centsToYuan } from '../../../types/project';
import type { Platform } from '../../../types/talent';
import { usePlatformConfig } from '../../../hooks/usePlatformConfig';
import {
  BUSINESS_TYPE_OPTIONS,
  type BusinessTypeKey,
  type Customer,
  type TalentProcurementStrategy,
  type AdPlacementStrategy,
  type ContentProductionStrategy,
  type PricingModel,
  type PlatformKPIConfigs,
  type PlatformKPIConfig,
} from '../../../types/customer';
import { projectApi } from '../../../services/projectApi';
import { customerApi } from '../../../services/customerApi';
import { logger } from '../../../utils/logger';

/**
 * 客户选项（包含业务策略）
 */
interface CustomerOption {
  value: string;
  label: string;
  businessStrategies?: Customer['businessStrategies'];
}

interface ProjectFormModalProps {
  open: boolean;
  editingProject: ProjectListItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * 平台 KPI 状态（用于组件内部状态管理）
 */
interface PlatformKPIState {
  enabled: boolean;
  enabledKPIs: string[];
  targets: Record<string, number>;
}

/**
 * KPI 元数据（硬编码）
 * 实际 KPI 的启用/禁用从客户配置读取
 */
const KPI_METADATA: Record<
  string,
  { name: string; unit: string; description: string }
> = {
  cpm: { name: 'CPM', unit: '元', description: '千次播放成本' },
  cpe: { name: 'CPE', unit: '元', description: '单次互动成本' },
  cpc: { name: 'CPC', unit: '元', description: '单次点击成本' },
  roi: { name: 'ROI', unit: '%', description: '投资回报率' },
};

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

  // 平台配置
  const { configs: platformConfigs, getPlatformNames } = usePlatformConfig();

  // 动态生成平台选项
  const platformOptions = useMemo(() => {
    return platformConfigs.map(c => ({
      label: c.name,
      value: c.platform as Platform,
    }));
  }, [platformConfigs]);

  // 动态获取平台名称映射
  const platformNames = useMemo(() => getPlatformNames(), [getPlatformNames]);

  // 当前选中的客户
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);

  // 选中的平台列表
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // 选中的业务类型
  const [selectedBusinessType, setSelectedBusinessType] =
    useState<BusinessTypeKey | null>(null);

  // 按平台的 KPI 配置状态
  // key: platform, value: { enabled, enabledKPIs, targets }
  const [platformKPIStates, setPlatformKPIStates] = useState<
    Record<
      string,
      {
        enabled: boolean;
        enabledKPIs: string[];
        targets: Record<string, number>;
      }
    >
  >({});

  const isEdit = !!editingProject;

  /**
   * 获取客户的按平台 KPI 配置
   */
  const customerPlatformKPIConfigs = useMemo((): PlatformKPIConfigs | null => {
    if (!selectedCustomer?.businessStrategies?.talentProcurement) {
      return null;
    }
    return (
      selectedCustomer.businessStrategies.talentProcurement
        .platformKPIConfigs || null
    );
  }, [selectedCustomer]);

  /**
   * 检查某个平台是否有 KPI 配置
   */
  const hasPlatformKPIConfig = useCallback(
    (platform: Platform): boolean => {
      const config = customerPlatformKPIConfigs?.[platform];
      return !!config?.enabled;
    },
    [customerPlatformKPIConfigs]
  );

  /**
   * 获取某个平台的客户 KPI 配置
   */
  const getPlatformKPIConfig = useCallback(
    (platform: Platform): PlatformKPIConfig | null => {
      const config = customerPlatformKPIConfigs?.[platform];
      return config?.enabled ? config : null;
    },
    [customerPlatformKPIConfigs]
  );

  /**
   * 获取客户启用的业务类型列表
   */
  const enabledBusinessTypes = useMemo(() => {
    if (!selectedCustomer?.businessStrategies) {
      return BUSINESS_TYPE_OPTIONS;
    }

    const strategies = selectedCustomer.businessStrategies;
    const enabled: Array<{ label: string; value: BusinessTypeKey }> = [];

    if (strategies.talentProcurement?.enabled) {
      enabled.push({ label: '达人采买', value: 'talentProcurement' });
    }
    if (strategies.adPlacement?.enabled) {
      enabled.push({ label: '广告投流', value: 'adPlacement' });
    }
    if (strategies.contentProduction?.enabled) {
      enabled.push({ label: '内容制作', value: 'contentProduction' });
    }

    return enabled.length > 0 ? enabled : BUSINESS_TYPE_OPTIONS;
  }, [selectedCustomer]);

  /**
   * 获取当前业务类型已配置的平台列表
   */
  const configuredPlatforms = useMemo(() => {
    if (!selectedCustomer?.businessStrategies || !selectedBusinessType) {
      return platformOptions;
    }

    // 目前只有达人采买有定价配置
    if (selectedBusinessType === 'talentProcurement') {
      const strategy = selectedCustomer.businessStrategies.talentProcurement;
      if (strategy?.platformPricingConfigs) {
        const configured = Object.entries(strategy.platformPricingConfigs)
          .filter(([, config]) => config?.enabled)
          .map(([platform]) => platform as Platform);

        if (configured.length > 0) {
          return platformOptions.filter(opt => configured.includes(opt.value));
        }
      }
    }

    return platformOptions;
  }, [selectedCustomer, selectedBusinessType, platformOptions]);

  /**
   * 获取当前业务类型的业务标签列表
   */
  const businessTagOptions = useMemo(() => {
    if (!selectedCustomer?.businessStrategies || !selectedBusinessType) {
      return [];
    }

    const strategy = selectedCustomer.businessStrategies[
      selectedBusinessType
    ] as
      | TalentProcurementStrategy
      | AdPlacementStrategy
      | ContentProductionStrategy
      | undefined;

    if (!strategy?.platformBusinessTags) {
      return [];
    }

    const allTags = new Set<string>();
    Object.values(strategy.platformBusinessTags).forEach(tags => {
      if (Array.isArray(tags)) {
        tags.forEach(tag => allTags.add(tag));
      }
    });

    return Array.from(allTags).map(tag => ({ label: tag, value: tag }));
  }, [selectedCustomer, selectedBusinessType]);

  /**
   * 获取平台的定价配置
   */
  const getPlatformPricingConfig = useCallback(
    (platform: Platform) => {
      if (
        !selectedCustomer?.businessStrategies?.talentProcurement ||
        selectedBusinessType !== 'talentProcurement'
      ) {
        return null;
      }

      const strategy = selectedCustomer.businessStrategies.talentProcurement;
      const platformConfig =
        strategy.platformPricingConfigs?.[platform] ||
        strategy.platformFees?.[platform];

      return platformConfig?.enabled ? platformConfig : null;
    },
    [selectedCustomer, selectedBusinessType]
  );

  /**
   * 检查折扣率是否只读（framework 模式）
   */
  const isDiscountReadOnly = useCallback(
    (platform: Platform): boolean => {
      const config = getPlatformPricingConfig(platform);
      return config?.pricingModel === 'framework';
    },
    [getPlatformPricingConfig]
  );

  /**
   * 获取平台的报价系数（只有 framework/hybrid 模式才有）
   */
  const getPlatformQuotationCoefficient = useCallback(
    (platform: Platform): number | null => {
      if (
        !selectedCustomer?.businessStrategies?.talentProcurement ||
        selectedBusinessType !== 'talentProcurement'
      ) {
        return null;
      }

      const strategy = selectedCustomer.businessStrategies.talentProcurement;
      const pricingConfig = strategy.platformPricingConfigs?.[platform];

      // 只有 framework 或 hybrid 模式才有报价系数
      if (!pricingConfig?.enabled || pricingConfig.pricingModel === 'project') {
        return null;
      }

      // 从 quotationCoefficients 中读取
      return strategy.quotationCoefficients?.[platform] ?? null;
    },
    [selectedCustomer, selectedBusinessType]
  );

  /**
   * 加载客户列表
   * @returns 返回客户选项列表
   */
  const loadCustomers = useCallback(
    async (searchTerm?: string): Promise<CustomerOption[]> => {
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
            businessStrategies: c.businessStrategies,
          }));
          setCustomerOptions(options);
          return options;
        }
        return [];
      } catch (error) {
        logger.error('Error loading customers:', error);
        return [];
      } finally {
        setCustomerLoading(false);
      }
    },
    []
  );

  /**
   * 客户选择变化
   * @param customerId 客户ID
   * @param skipReset 是否跳过重置（编辑模式初始化时使用）
   * @param optionsOverride 可选的客户选项列表（编辑模式初始化时使用刚加载的数据）
   */
  const handleCustomerChange = async (
    customerId: string,
    skipReset = false,
    optionsOverride?: CustomerOption[]
  ) => {
    // 使用传入的选项列表或当前状态中的选项
    const options = optionsOverride || customerOptions;
    let customer = options.find(c => c.value === customerId);

    if (customer && !customer.businessStrategies) {
      try {
        const response = await customerApi.getCustomerById(customerId);
        if (response.success && response.data) {
          customer = {
            ...customer,
            businessStrategies: response.data.businessStrategies,
          };
          setCustomerOptions(prev =>
            prev.map(c => (c.value === customerId ? customer! : c))
          );
        } else {
          message.error('加载客户配置失败');
          return;
        }
      } catch (error) {
        logger.error('Error loading customer details:', error);
        message.error('加载客户配置失败');
        return;
      }
    }

    setSelectedCustomer(customer || null);

    // 仅在非编辑模式初始化时重置
    if (!skipReset) {
      form.setFieldValue('businessType', undefined);
      form.setFieldValue('businessTag', undefined);
      setSelectedBusinessType(null);
      setSelectedPlatforms([]);
      form.setFieldValue('platforms', []);
      setPlatformKPIStates({});
    }
  };

  /**
   * 业务类型变化
   */
  const handleBusinessTypeChange = (businessType: BusinessTypeKey) => {
    setSelectedBusinessType(businessType);
    form.setFieldValue('businessTag', undefined);
    form.setFieldValue('platforms', []);
    setSelectedPlatforms([]);
  };

  /**
   * 平台选择变化
   */
  const handlePlatformsChange = (platforms: Platform[]) => {
    setSelectedPlatforms(platforms);
    updatePlatformDiscounts(platforms);
    initializePlatformKPIStates(platforms);
  };

  /**
   * 初始化按平台的 KPI 状态（从客户配置继承）
   */
  const initializePlatformKPIStates = (platforms: Platform[]) => {
    if (!customerPlatformKPIConfigs) {
      setPlatformKPIStates({});
      return;
    }

    const newStates: Record<
      string,
      {
        enabled: boolean;
        enabledKPIs: string[];
        targets: Record<string, number>;
      }
    > = {};

    platforms.forEach(platform => {
      const customerConfig = customerPlatformKPIConfigs[platform];
      if (customerConfig?.enabled) {
        // 从客户配置继承默认值
        newStates[platform] = {
          enabled: true,
          enabledKPIs: customerConfig.enabledKPIs || [],
          targets: customerConfig.defaultTargets
            ? { ...customerConfig.defaultTargets }
            : {},
        };
      }
    });

    setPlatformKPIStates(newStates);
  };

  /**
   * 更新按平台折扣率和定价模式
   */
  const updatePlatformDiscounts = (platforms: Platform[]) => {
    if (selectedBusinessType !== 'talentProcurement') return;

    const discounts: Record<string, number | undefined> = {};
    platforms.forEach(platform => {
      const config = getPlatformPricingConfig(platform);
      if (config?.discountRate) {
        discounts[platform] = config.discountRate * 100;
      }
    });

    form.setFieldValue('platformDiscounts', discounts);
  };

  /**
   * 初始化表单
   */
  useEffect(() => {
    if (open) {
      const initForm = async () => {
        // 先加载客户列表，获取返回的客户选项
        const loadedOptions = await loadCustomers();

        if (editingProject) {
          // 编辑模式
          const formValues: Record<string, unknown> = {
            projectCode: editingProject.projectCode,
            name: editingProject.name,
            customerId: editingProject.customerId,
            businessType: editingProject.businessType || 'talentProcurement',
            businessTag: editingProject.businessTag || editingProject.type,
            platforms: editingProject.platforms,
            year: editingProject.year,
            month: editingProject.month,
            // 财务周期：优先使用已保存的值，否则默认等于业务周期
            financialYear: editingProject.financialYear || editingProject.year,
            financialMonth:
              editingProject.financialMonth || editingProject.month,
            budget: centsToYuan(editingProject.budget),
          };

          // 处理折扣率
          if (editingProject.platformDiscounts) {
            const discounts: Record<string, number> = {};
            Object.entries(editingProject.platformDiscounts).forEach(
              ([platform, rate]) => {
                if (rate !== undefined) {
                  discounts[platform] = rate * 100;
                }
              }
            );
            formValues.platformDiscounts = discounts;
          } else if (editingProject.discount) {
            const discounts: Record<string, number> = {};
            editingProject.platforms.forEach(platform => {
              discounts[platform] = editingProject.discount! * 100;
            });
            formValues.platformDiscounts = discounts;
          }

          form.setFieldsValue(formValues);
          setSelectedPlatforms(editingProject.platforms || []);
          setSelectedBusinessType(
            (editingProject.businessType as BusinessTypeKey) ||
              'talentProcurement'
          );

          // 编辑模式：初始化 KPI 配置状态
          if (editingProject.platformKPIConfigs) {
            const kpiStates: Record<string, PlatformKPIState> = {};
            Object.entries(editingProject.platformKPIConfigs).forEach(
              ([platform, config]) => {
                if (config) {
                  kpiStates[platform] = {
                    enabled: config.enabled,
                    enabledKPIs: config.enabledKPIs || [],
                    targets: config.targets || {},
                  };
                }
              }
            );
            setPlatformKPIStates(kpiStates);
          } else {
            setPlatformKPIStates({});
          }

          // 编辑模式：加载客户详情但不重置表单字段，传入刚加载的客户列表
          handleCustomerChange(editingProject.customerId, true, loadedOptions);
        } else {
          // 新建模式
          const now = new Date();
          form.setFieldsValue({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            // 财务周期默认等于业务周期
            financialYear: now.getFullYear(),
            financialMonth: now.getMonth() + 1,
            platforms: [],
            businessType: undefined,
          });
          setSelectedPlatforms([]);
          setSelectedBusinessType(null);
          setSelectedCustomer(null);
          setPlatformKPIStates({});
        }
      };

      initForm().catch(error => {
        logger.error('Failed to initialize form:', error);
        message.error('表单初始化失败');
      });
    }
  }, [open, editingProject, form, loadCustomers]);

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 转换折扣率为小数，并收集定价模式和报价系数快照
      let platformDiscounts: PlatformDiscounts | undefined;
      let platformPricingModes: PlatformPricingModes | undefined;
      let platformQuotationCoefficients:
        | PlatformQuotationCoefficients
        | undefined;

      if (values.platformDiscounts) {
        platformDiscounts = {};
        platformPricingModes = {};
        platformQuotationCoefficients = {};

        Object.entries(values.platformDiscounts).forEach(([platform, rate]) => {
          if (rate !== undefined && rate !== null) {
            platformDiscounts![platform] = (rate as number) / 100;
            // 存储定价模式快照
            const config = getPlatformPricingConfig(platform as Platform);
            if (config) {
              platformPricingModes![platform] = config.pricingModel;
            }
            // 存储报价系数快照（只有 framework/hybrid 模式才有）
            const coefficient = getPlatformQuotationCoefficient(
              platform as Platform
            );
            if (coefficient !== null) {
              platformQuotationCoefficients![platform] = coefficient;
            }
          }
        });

        // 如果没有任何报价系数，设为 undefined
        if (Object.keys(platformQuotationCoefficients).length === 0) {
          platformQuotationCoefficients = undefined;
        }
      }

      // 构建按平台 KPI 配置
      // 注意：编辑模式下必须发送完整配置，包括已关闭的平台（enabled: false）
      // 否则数据库中的配置不会被更新
      let platformKPIConfigs: ProjectKPIConfigs | undefined;

      if (isEdit) {
        // 编辑模式：发送所有选中平台的 KPI 配置状态
        platformKPIConfigs = {};
        selectedPlatforms.forEach(platform => {
          const state = platformKPIStates[platform];
          if (state) {
            platformKPIConfigs![platform] = {
              enabled: state.enabled,
              enabledKPIs: state.enabled ? state.enabledKPIs : [],
              targets: state.enabled ? state.targets : {},
            };
          }
        });
        // 如果没有任何配置，设为空对象以清除数据库中的旧配置
        if (Object.keys(platformKPIConfigs).length === 0) {
          platformKPIConfigs = {};
        }
      } else {
        // 新建模式：只发送启用的配置
        const hasAnyKPIEnabled = Object.values(platformKPIStates).some(
          s => s.enabled && s.enabledKPIs.length > 0
        );
        if (hasAnyKPIEnabled) {
          platformKPIConfigs = {};
          Object.entries(platformKPIStates).forEach(([platform, state]) => {
            if (state.enabled && state.enabledKPIs.length > 0) {
              platformKPIConfigs![platform] = {
                enabled: true,
                enabledKPIs: state.enabledKPIs,
                targets: state.targets,
              };
            }
          });
        }
      }

      // 构建请求数据
      const data: CreateProjectRequest = {
        projectCode: values.projectCode,
        name: values.name,
        customerId: values.customerId,
        businessType: values.businessType,
        businessTag: values.businessTag,
        platforms: values.platforms,
        year: values.year,
        month: values.month,
        financialYear: values.financialYear,
        financialMonth: values.financialMonth,
        budget: yuanToCents(values.budget),
        platformDiscounts,
        platformPricingModes,
        platformQuotationCoefficients,
        platformKPIConfigs,
        type: values.businessTag,
      };

      let response;
      if (isEdit && editingProject) {
        response = await projectApi.updateProject(editingProject.id, {
          projectCode: data.projectCode,
          name: data.name,
          businessType: data.businessType,
          businessTag: data.businessTag,
          type: data.businessTag,
          platforms: data.platforms,
          year: data.year,
          month: data.month,
          financialYear: data.financialYear,
          financialMonth: data.financialMonth,
          budget: data.budget,
          platformDiscounts: data.platformDiscounts,
          platformPricingModes: data.platformPricingModes,
          platformQuotationCoefficients: data.platformQuotationCoefficients,
          platformKPIConfigs: data.platformKPIConfigs,
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
    setSelectedCustomer(null);
    setSelectedBusinessType(null);
    setSelectedPlatforms([]);
    setPlatformKPIStates({});
    onCancel();
  };

  /**
   * 获取定价模式标签
   */
  const getPricingModeTag = (platform: Platform) => {
    const config = getPlatformPricingConfig(platform);
    if (!config) return null;

    const modeConfig: Record<PricingModel, { color: string; text: string }> = {
      framework: { color: 'blue', text: '框架' },
      project: { color: 'orange', text: '项目' },
      hybrid: { color: 'purple', text: '混合' },
    };

    const mode = modeConfig[config.pricingModel || 'framework'];
    return (
      <Tag color={mode.color} className="ml-2">
        {mode.text}
      </Tag>
    );
  };

  return (
    <Modal
      title={isEdit ? '编辑项目' : '新建项目'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={720}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
        requiredMark="optional"
      >
        {/* 基础信息 */}
        <Card
          size="small"
          title="基础信息"
          className="mb-4"
          styles={{ body: { paddingBottom: 0 } }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="projectCode"
                label="项目编号"
                rules={[{ max: 50, message: '项目编号不能超过50字符' }]}
              >
                <Input placeholder="例如：PRJ202512001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="name"
                label="项目名称"
                rules={[
                  { required: true, message: '请输入项目名称' },
                  { max: 100, message: '项目名称不能超过100字符' },
                ]}
              >
                <Input placeholder="例如：25年M12抖音投放" />
              </Form.Item>
            </Col>
            <Col span={8}>
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
                  onChange={(value: string) => handleCustomerChange(value)}
                  loading={customerLoading}
                  notFoundContent={
                    customerLoading ? <Spin size="small" /> : '暂无数据'
                  }
                  options={customerOptions.map(({ value, label }) => ({
                    value,
                    label,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="businessType"
                label="业务类型"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select
                  placeholder="请选择"
                  options={enabledBusinessTypes}
                  onChange={handleBusinessTypeChange}
                  disabled={!selectedCustomer}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessTag" label="业务标签">
                <Select
                  placeholder={
                    businessTagOptions.length > 0 ? '可选' : '暂无配置'
                  }
                  options={businessTagOptions}
                  allowClear
                  showSearch
                  disabled={!selectedBusinessType}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    业务周期
                    <Tooltip title="项目执行的业务归属月份（面向客户）">
                      <InfoCircleOutlined className="ml-1 text-gray-400" />
                    </Tooltip>
                  </span>
                }
                required
              >
                <div className="flex gap-2">
                  <Form.Item
                    name="year"
                    noStyle
                    rules={[{ required: true, message: '请选择年份' }]}
                  >
                    <Select
                      placeholder="年"
                      className="flex-1"
                      options={getYearOptions()}
                    />
                  </Form.Item>
                  <Form.Item
                    name="month"
                    noStyle
                    rules={[{ required: true, message: '请选择月份' }]}
                  >
                    <Select
                      placeholder="月"
                      className="flex-1"
                      options={getMonthOptions()}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <span>
                    财务周期
                    <Tooltip title="项目的财务归属月份（面向公司财务）">
                      <InfoCircleOutlined className="ml-1 text-gray-400" />
                    </Tooltip>
                  </span>
                }
                required
              >
                <div className="flex gap-2">
                  <Form.Item
                    name="financialYear"
                    noStyle
                    rules={[{ required: true, message: '请选择年份' }]}
                  >
                    <Select
                      placeholder="年"
                      className="flex-1"
                      options={getYearOptions()}
                    />
                  </Form.Item>
                  <Form.Item
                    name="financialMonth"
                    noStyle
                    rules={[{ required: true, message: '请选择月份' }]}
                  >
                    <Select
                      placeholder="月"
                      className="flex-1"
                      options={getMonthOptions()}
                    />
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 投放配置 - 简化版：每行显示平台+预算+折扣率 */}
        <Card
          size="small"
          title={
            <span>
              投放配置
              {selectedBusinessType === 'talentProcurement' &&
                configuredPlatforms.length < platformOptions.length && (
                  <Tooltip title="仅显示客户已配置定价策略的平台">
                    <InfoCircleOutlined className="ml-1 text-gray-400" />
                  </Tooltip>
                )}
            </span>
          }
          className="mb-4"
          styles={{ body: { paddingBottom: 8 } }}
        >
          {/* 隐藏的 platforms 字段用于表单验证 */}
          <Form.Item
            name="platforms"
            hidden
            rules={[
              { required: true, message: '请选择至少一个投放平台' },
              { type: 'array', min: 1, message: '请选择至少一个投放平台' },
            ]}
          >
            <Input />
          </Form.Item>

          {/* 总预算 */}
          <Row gutter={16} className="mb-2">
            <Col span={24}>
              <Form.Item
                name="budget"
                label="项目总预算"
                rules={[
                  { required: true, message: '请输入项目预算' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value < 0) {
                        return Promise.reject('预算不能为负数');
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                className="mb-2"
              >
                <InputNumber
                  placeholder="输入总预算"
                  style={{ width: 210 }}
                  suffix="元"
                  min={0}
                  formatter={value =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={value => Number(value?.replace(/,/g, '') || 0) as 0}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 平台列表 - 每行：勾选框 + 平台名 + 定价模式标签 + 折扣率 */}
          <div className="text-sm text-gray-500 mb-2">选择投放平台：</div>
          <div className="space-y-2">
            {configuredPlatforms.map(opt => {
              const platform = opt.value;
              const isSelected = selectedPlatforms.includes(platform);
              const isReadOnly = isDiscountReadOnly(platform);

              return (
                <div
                  key={platform}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* 平台勾选 */}
                  <Checkbox
                    checked={isSelected}
                    disabled={!selectedBusinessType}
                    onChange={e => {
                      const newPlatforms = e.target.checked
                        ? [...selectedPlatforms, platform]
                        : selectedPlatforms.filter(p => p !== platform);
                      form.setFieldValue('platforms', newPlatforms);
                      handlePlatformsChange(newPlatforms);
                    }}
                  />

                  {/* 平台名称 + 定价模式标签 */}
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span
                      className={isSelected ? 'font-medium' : 'text-gray-500'}
                    >
                      {opt.label}
                    </span>
                    {isSelected && getPricingModeTag(platform)}
                  </div>

                  {/* 折扣率和报价系数（选中后显示） */}
                  {isSelected && (
                    <div className="flex items-center gap-4 flex-1">
                      {/* 折扣率 */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">折扣率:</span>
                        <Form.Item
                          name={['platformDiscounts', platform]}
                          noStyle
                        >
                          <InputNumber
                            placeholder="79.5"
                            min={0}
                            max={100}
                            precision={2}
                            suffix="%"
                            disabled={isReadOnly}
                            style={{ width: 100 }}
                            size="small"
                          />
                        </Form.Item>
                        {isReadOnly && (
                          <Tooltip title="框架模式，折扣率自动读取">
                            <LockOutlined className="text-gray-400 text-xs" />
                          </Tooltip>
                        )}
                      </div>

                      {/* 报价系数（只有 framework/hybrid 模式才显示） */}
                      {(() => {
                        const coefficient =
                          getPlatformQuotationCoefficient(platform);
                        if (coefficient === null) return null;
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              报价系数:
                            </span>
                            <span className="font-medium text-blue-600">
                              {coefficient.toFixed(4)}
                            </span>
                            <Tooltip title="报价系数 = 折扣率 × (1 - 平台服务费率) × (1 - 机构服务费率)，用于计算达人报价">
                              <InfoCircleOutlined className="text-gray-400 text-xs" />
                            </Tooltip>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 未选择平台时的提示 */}
          {selectedPlatforms.length === 0 && selectedBusinessType && (
            <div className="text-center py-2 text-orange-500 text-sm">
              请至少选择一个投放平台
            </div>
          )}
        </Card>

        {/* 交付 KPI（按平台展示） */}
        {selectedPlatforms.some(p => hasPlatformKPIConfig(p)) && (
          <Card
            size="small"
            title={
              <span>
                交付KPI
                <Tooltip title="各平台独立配置 KPI 考核目标">
                  <InfoCircleOutlined className="ml-2 text-gray-400" />
                </Tooltip>
              </span>
            }
            className="mb-4"
            styles={{ body: { paddingBottom: 0 } }}
          >
            {selectedPlatforms.map(platform => {
              const customerConfig = getPlatformKPIConfig(platform);
              if (!customerConfig) return null;

              const state = platformKPIStates[platform] || {
                enabled: false,
                enabledKPIs: [],
                targets: {},
              };

              return (
                <div key={platform} className="mb-4 last:mb-0">
                  {/* 平台标题 + 开关 */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">
                        {platformNames[platform] || platform}
                      </span>
                      <Tag color="green" className="text-xs">
                        客户已配置
                      </Tag>
                    </span>
                    <Switch
                      size="small"
                      checked={state.enabled}
                      onChange={checked => {
                        setPlatformKPIStates(prev => ({
                          ...prev,
                          [platform]: {
                            ...prev[platform],
                            enabled: checked,
                            enabledKPIs: checked
                              ? customerConfig.enabledKPIs || []
                              : [],
                            targets:
                              checked && customerConfig.defaultTargets
                                ? { ...customerConfig.defaultTargets }
                                : {},
                          },
                        }));
                      }}
                      checkedChildren="启用"
                      unCheckedChildren="关闭"
                    />
                  </div>

                  {state.enabled && (
                    <div className="pl-4">
                      {/* 考核指标选择 */}
                      <div className="mb-3">
                        <div className="text-sm text-gray-500 mb-2">
                          考核指标：
                        </div>
                        <Checkbox.Group
                          value={state.enabledKPIs}
                          onChange={values => {
                            const newEnabledKPIs = values as string[];
                            // 清除取消勾选的 KPI 的目标值
                            const newTargets = { ...state.targets };
                            Object.keys(newTargets).forEach(key => {
                              if (!newEnabledKPIs.includes(key)) {
                                delete newTargets[key];
                              }
                            });
                            setPlatformKPIStates(prev => ({
                              ...prev,
                              [platform]: {
                                ...prev[platform],
                                enabledKPIs: newEnabledKPIs,
                                targets: newTargets,
                              },
                            }));
                          }}
                          options={(customerConfig.enabledKPIs || [])
                            .filter(key => KPI_METADATA[key])
                            .map(key => ({
                              label: KPI_METADATA[key].name,
                              value: key,
                            }))}
                        />
                      </div>

                      {/* 目标值输入 */}
                      {state.enabledKPIs.length > 0 && (
                        <Row gutter={16}>
                          {state.enabledKPIs.map(kpiKey => {
                            const kpi = KPI_METADATA[kpiKey];
                            if (!kpi) return null;
                            return (
                              <Col span={12} key={kpiKey}>
                                <div className="mb-3">
                                  <div className="text-sm text-gray-500 mb-1">
                                    {kpi.name} 目标：
                                  </div>
                                  <Space.Compact style={{ width: '100%' }}>
                                    <InputNumber
                                      placeholder={`输入${kpi.name}目标`}
                                      style={{ width: 'calc(100% - 40px)' }}
                                      min={0}
                                      precision={2}
                                      value={state.targets[kpiKey]}
                                      onChange={value => {
                                        setPlatformKPIStates(prev => {
                                          const currentTargets =
                                            prev[platform]?.targets || {};
                                          const newTargets = {
                                            ...currentTargets,
                                          };
                                          if (
                                            value !== null &&
                                            value !== undefined
                                          ) {
                                            newTargets[kpiKey] = value;
                                          } else {
                                            delete newTargets[kpiKey];
                                          }
                                          return {
                                            ...prev,
                                            [platform]: {
                                              ...prev[platform],
                                              targets: newTargets,
                                            },
                                          };
                                        });
                                      }}
                                    />
                                    <Input
                                      style={{
                                        width: 40,
                                        pointerEvents: 'none',
                                        textAlign: 'center',
                                      }}
                                      defaultValue={kpi.unit}
                                      disabled
                                    />
                                  </Space.Compact>
                                </div>
                              </Col>
                            );
                          })}
                        </Row>
                      )}
                    </div>
                  )}

                  {!state.enabled && (
                    <div className="text-gray-400 text-sm pl-4">
                      可开启后设置该平台的 KPI 目标值
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </Form>
    </Modal>
  );
}

export default ProjectFormModal;
