/**
 * 机构返点管理弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 Tabs 组件替代手写 Tab 导航
 * 3. 使用 ProCard 组织内容区域
 * 4. 使用 ProForm + ProFormDigit 管理手动调整表单
 * 5. 使用 Select 替代手写平台选择器
 * 6. 使用 Alert 替代手写提示框
 * 7. 使用 message 替代 Toast
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Alert,
  Button,
  Select,
  message,
  Spin,
  Checkbox,
  Table,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormText,
  ProFormDatePicker,
} from '@ant-design/pro-components';
import { logger } from '../utils/logger';
import type { Agency } from '../types/agency';
import type { Platform } from '../types/talent';
import { PLATFORM_NAMES } from '../types/talent';
import {
  updateAgencyRebate,
  getAgencyRebateHistory,
  getCurrentAgencyRebate,
  type AgencyRebateHistoryRecord,
  type CurrentAgencyRebateConfig,
} from '../api/agency';
import { REBATE_VALIDATION, formatRebateRate } from '../types/rebate';
import { usePlatformConfig } from '../hooks/usePlatformConfig';

interface AgencyRebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess?: () => void;
}

type TabType = 'current' | 'manual' | 'stepRule' | 'history';

export function AgencyRebateModal({
  isOpen,
  onClose,
  agency,
  onSuccess,
}: AgencyRebateModalProps) {
  // 使用平台配置 Hook（只获取启用的平台）
  const { getPlatformList } = usePlatformConfig(false);
  const supportedPlatforms = getPlatformList();

  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(
    supportedPlatforms[0] || 'douyin'
  );

  // 当前平台的配置
  const [currentConfig, setCurrentConfig] =
    useState<CurrentAgencyRebateConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  // 手动调整表单
  const [rebateRate, setRebateRate] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('system');
  const [syncToTalents, setSyncToTalents] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // 历史记录
  const [historyRecords, setHistoryRecords] = useState<
    AgencyRebateHistoryRecord[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 5;

  // 加载当前平台的配置
  const loadCurrentConfig = async (platform: Platform) => {
    if (!agency) return;

    try {
      setConfigLoading(true);
      const response = await getCurrentAgencyRebate({
        agencyId: agency.id,
        platform,
      });

      if (response.success && response.data) {
        setCurrentConfig(response.data);
        setRebateRate(response.data.rebateRate.toString());
        setEffectiveDate(
          response.data.effectiveDate || new Date().toISOString().split('T')[0]
        );
      } else {
        setCurrentConfig(null);
        setRebateRate('');
        setEffectiveDate(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      logger.error('加载当前配置失败:', error);
      setCurrentConfig(null);
      setRebateRate('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    } finally {
      setConfigLoading(false);
    }
  };

  // 加载历史记录
  const loadHistory = async (page: number) => {
    if (!agency) return;

    try {
      setHistoryLoading(true);
      setCurrentPage(page);
      const offset = (page - 1) * pageSize;

      const response = await getAgencyRebateHistory({
        agencyId: agency.id,
        platform: selectedPlatform,
        limit: pageSize,
        offset,
      });

      if (response.success && response.data) {
        setHistoryRecords(response.data.records);
        setTotalRecords(response.data.total);
      }
    } catch (error) {
      logger.error('加载历史记录失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 平台切换时重新加载数据
  useEffect(() => {
    if (isOpen && agency) {
      loadCurrentConfig(selectedPlatform);
      if (activeTab === 'history') {
        loadHistory(1);
      }
    }
  }, [selectedPlatform, isOpen, agency]);

  // Tab 切换时加载对应数据
  useEffect(() => {
    if (isOpen && agency && activeTab === 'history') {
      loadHistory(1);
    }
  }, [activeTab, isOpen, agency]);

  // 提交手动调整
  const handleSubmit = async () => {
    if (!agency) return;

    const rate = parseFloat(rebateRate);
    if (
      isNaN(rate) ||
      rate < REBATE_VALIDATION.min ||
      rate > REBATE_VALIDATION.max
    ) {
      message.error(
        `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
      );
      return;
    }

    try {
      setLoading(true);
      const response = await updateAgencyRebate({
        agencyId: agency.id,
        platform: selectedPlatform,
        rebateConfig: {
          baseRebate: rate,
          effectiveDate,
          updatedBy,
        },
        syncToTalents,
      });

      if (response.success) {
        message.success('返点更新成功');
        await loadCurrentConfig(selectedPlatform);
        if (onSuccess) onSuccess();
        setActiveTab('current');
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (error) {
      logger.error('更新返点失败:', error);
      message.error('更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!agency) return null;

  // 历史记录表格列
  const historyColumns = [
    {
      title: '调整前',
      dataIndex: 'previousRate',
      key: 'previousRate',
      width: 80,
      render: (rate: number) => formatRebateRate(rate),
    },
    {
      title: '调整后',
      dataIndex: 'newRate',
      key: 'newRate',
      width: 80,
      render: (rate: number) => (
        <span className="font-semibold text-green-600">
          {formatRebateRate(rate)}
        </span>
      ),
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 100,
    },
    {
      title: '操作人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      width: 80,
    },
    {
      title: '同步达人',
      dataIndex: 'syncToTalents',
      key: 'syncToTalents',
      width: 80,
      render: (sync: boolean) => (
        <span className={sync ? 'text-green-600' : 'text-gray-400'}>
          {sync ? '是' : '否'}
        </span>
      ),
    },
    {
      title: '调整时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  const tabItems = [
    {
      key: 'current',
      label: '当前返点',
      children: (
        <ProCard>
          {configLoading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : currentConfig && currentConfig.hasConfig ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">当前返点率</div>
                  <div className="text-2xl font-bold text-primary-600">
                    {formatRebateRate(currentConfig.rebateRate)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">生效日期</div>
                  <div className="text-base font-medium text-gray-900">
                    {currentConfig.effectiveDate || '-'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-600">最后更新时间</div>
                  <div className="text-sm text-gray-900">
                    {currentConfig.lastUpdatedAt
                      ? new Date(currentConfig.lastUpdatedAt).toLocaleString(
                          'zh-CN'
                        )
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">更新人</div>
                  <div className="text-sm text-gray-900">
                    {currentConfig.updatedBy || '-'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert
              message="尚未配置"
              description={`该机构在${PLATFORM_NAMES[selectedPlatform]}平台还未配置返点率，请前往"手动调整"标签进行设置。`}
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          )}
        </ProCard>
      ),
    },
    {
      key: 'manual',
      label: '手动调整',
      children: (
        <ProCard>
          <ProForm
            onFinish={handleSubmit}
            submitter={{
              render: (_, dom) => (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                  {dom}
                </div>
              ),
              submitButtonProps: {
                loading,
                children: '保存并应用',
              },
            }}
            layout="vertical"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <ProFormDigit
                label="返点率"
                name="rebateRate"
                initialValue={rebateRate}
                fieldProps={{
                  value: Number(rebateRate) || 0,
                  onChange: value => setRebateRate(value?.toString() || ''),
                  precision: 2,
                  min: REBATE_VALIDATION.min,
                  max: REBATE_VALIDATION.max,
                  addonAfter: '%',
                }}
                rules={[
                  { required: true, message: '请输入返点率' },
                  {
                    validator: (_: any, value: any) => {
                      if (
                        value < REBATE_VALIDATION.min ||
                        value > REBATE_VALIDATION.max
                      ) {
                        return Promise.reject(
                          `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              />
              <ProFormDatePicker
                label="生效日期"
                name="effectiveDate"
                initialValue={effectiveDate}
                fieldProps={{
                  value: effectiveDate,
                  onChange: (_: any, dateString: any) =>
                    setEffectiveDate(dateString as string),
                  format: 'YYYY-MM-DD',
                }}
                rules={[{ required: true, message: '请选择生效日期' }]}
              />
            </div>
            <ProFormText
              label="操作人"
              name="updatedBy"
              initialValue={updatedBy}
              fieldProps={{
                value: updatedBy,
                onChange: e => setUpdatedBy(e.target.value),
                placeholder: '请输入操作人姓名',
              }}
              rules={[{ required: true, message: '请输入操作人' }]}
            />
            <div className="mt-4">
              <Checkbox
                checked={syncToTalents}
                onChange={e => setSyncToTalents(e.target.checked)}
              >
                <span className="text-sm">
                  立即同步到该机构在此平台的所有达人
                </span>
              </Checkbox>
            </div>
            <Alert
              message="提示"
              description="机构返点配置会立即生效，如勾选同步，将同时更新该机构下所有达人的返点率。"
              type="warning"
              showIcon
              className="mt-4"
            />
          </ProForm>
        </ProCard>
      ),
    },
    {
      key: 'stepRule',
      label: (
        <span className="flex items-center gap-2">
          阶梯规则
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
            Phase 2
          </span>
        </span>
      ),
      disabled: true,
      children: (
        <ProCard>
          <Alert
            message="功能开发中"
            description="阶梯返点规则功能将在 Phase 2 版本中推出，敬请期待。该功能将支持根据业绩区间自动调整返点率。"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        </ProCard>
      ),
    },
    {
      key: 'history',
      label: `调整历史 (${totalRecords})`,
      children: (
        <ProCard>
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : historyRecords.length > 0 ? (
            <>
              <Table
                dataSource={historyRecords}
                columns={historyColumns}
                pagination={false}
                size="small"
                rowKey={record => `${record.createdAt}-${record.newRate}`}
              />
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-xs text-gray-500">
                  共 {totalRecords} 条记录，第 {currentPage} /{' '}
                  {Math.ceil(totalRecords / pageSize)} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    size="small"
                    onClick={() => loadHistory(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </Button>
                  <Button
                    size="small"
                    onClick={() => loadHistory(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <Alert
              message="暂无历史记录"
              description={`该机构在${PLATFORM_NAMES[selectedPlatform]}平台还没有返点调整记录。`}
              type="info"
              showIcon
            />
          )}
        </ProCard>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div>
          <div className="text-base font-semibold">
            机构返点管理 - {agency.name}
          </div>
          <div className="text-xs font-normal text-gray-500 mt-1">
            选择平台后查看和管理该机构的返点配置
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
      centered
    >
      {/* 平台选择器 */}
      <div className="mb-4 pb-4 border-b">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择平台
        </label>
        <Select
          value={selectedPlatform}
          onChange={value => setSelectedPlatform(value)}
          style={{ width: 200 }}
          options={supportedPlatforms.map(platform => ({
            value: platform,
            label: PLATFORM_NAMES[platform],
          }))}
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={key => setActiveTab(key as TabType)}
        items={tabItems}
      />
    </Modal>
  );
}
