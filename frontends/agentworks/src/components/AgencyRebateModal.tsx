/**
 * 机构返点管理弹窗 - v3.0
 *
 * v3.0 改动：
 * - 将"手动调整"改为"统一返点"
 * - 新增"独立返点"Tab，支持为机构达人批量设置不同返点率
 *
 * Tab 结构：
 * 1. 当前返点 - 显示当前配置
 * 2. 统一返点 - 设置机构统一返点率（所有 sync 模式达人跟随）
 * 3. 独立返点 - 为达人设置独立返点率（切换为 independent 模式）
 * 4. 阶梯规则 - Phase 2
 * 5. 调整历史 - 历史记录
 */

import { useState, useEffect, useCallback } from 'react';
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
  InputNumber,
  Tag,
  Empty,
} from 'antd';
import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  ProCard,
  ProForm,
  ProFormDigit,
  ProFormText,
  ProFormDatePicker,
} from '@ant-design/pro-components';
import { logger } from '../utils/logger';
import type { Agency } from '../types/agency';
import type { Platform, Talent } from '../types/talent';
import {
  updateAgencyRebate,
  getAgencyRebateHistory,
  getCurrentAgencyRebate,
  type AgencyRebateHistoryRecord,
  type CurrentAgencyRebateConfig,
} from '../api/agency';
import {
  getTalents,
  batchSetIndependentRebate,
  type SetIndependentRebateTalentItem,
} from '../api/talent';
import { REBATE_VALIDATION, formatRebateRate } from '../types/rebate';
import { usePlatformConfig } from '../hooks/usePlatformConfig';

interface AgencyRebateModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: Agency | null;
  onSuccess?: () => void;
}

type TabType = 'current' | 'unified' | 'independent' | 'stepRule' | 'history';

/** 扩展的达人数据（包含 UI 状态） */
interface TalentWithUI extends Talent {
  key: string;
  selected: boolean;
}

export function AgencyRebateModal({
  isOpen,
  onClose,
  agency,
  onSuccess,
}: AgencyRebateModalProps) {
  // 使用平台配置 Hook（只获取启用的平台）
  const { getPlatformList, getPlatformNames } = usePlatformConfig(false);
  const supportedPlatforms = getPlatformList();
  const platformNames = getPlatformNames();

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

  // 独立返点 Tab 状态
  const [talents, setTalents] = useState<TalentWithUI[]>([]);
  const [talentsLoading, setTalentsLoading] = useState(false);
  const [talentPage, setTalentPage] = useState(1);
  const [talentPageSize] = useState(10);
  const [talentTotal, setTalentTotal] = useState(0);
  /** 存储每个达人的独立返点率 { [oneId_platform]: rebateRate } */
  const [talentRebateRates, setTalentRebateRates] = useState<
    Record<string, number>
  >({});
  const [settingRebate, setSettingRebate] = useState(false);

  // 计算选中数量
  const selectedCount = talents.filter(t => t.selected).length;

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

  // 加载机构达人列表（独立返点 Tab 使用）
  const loadTalents = useCallback(
    async (pageNum = 1) => {
      if (!agency?.id) return;

      setTalentsLoading(true);

      try {
        const response = await getTalents({
          agencyId: agency.id,
          platform: selectedPlatform,
          page: pageNum,
          limit: talentPageSize,
        });

        if (response.success && response.data) {
          const talentsWithUI: TalentWithUI[] = response.data.map(t => ({
            ...t,
            key: `${t.oneId}_${t.platform}`,
            selected: false,
          }));
          setTalents(talentsWithUI);
          setTalentTotal(response.total || 0);
          setTalentPage(pageNum);

          // 初始化返点率
          const initialRates: Record<string, number> = {};
          talentsWithUI.forEach(t => {
            initialRates[t.key] = t.currentRebate?.rate ?? 0;
          });
          setTalentRebateRates(prev => ({ ...prev, ...initialRates }));
        } else {
          message.error(response.message || '获取达人列表失败');
        }
      } catch (error) {
        logger.error('获取达人列表失败:', error);
        message.error('获取达人列表失败');
      } finally {
        setTalentsLoading(false);
      }
    },
    [agency?.id, selectedPlatform, talentPageSize]
  );

  // 切换单条选中状态
  const toggleSelection = (key: string) => {
    setTalents(prev =>
      prev.map(t => (t.key === key ? { ...t, selected: !t.selected } : t))
    );
  };

  // 全选/取消全选
  const toggleSelectAll = (checked: boolean) => {
    setTalents(prev => prev.map(t => ({ ...t, selected: checked })));
  };

  // 执行批量设置独立返点
  const handleSetIndependentRebate = async () => {
    const selected = talents.filter(t => t.selected);
    if (selected.length === 0) {
      message.warning('请先选择要设置返点的达人');
      return;
    }

    // 验证所有返点率是否有效
    for (const t of selected) {
      const rate = talentRebateRates[t.key];
      if (
        rate === undefined ||
        rate < REBATE_VALIDATION.min ||
        rate > REBATE_VALIDATION.max
      ) {
        message.error(
          `"${t.name}" 的返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max} 之间`
        );
        return;
      }
    }

    // 构建请求数据
    const talentList: SetIndependentRebateTalentItem[] = selected.map(t => ({
      oneId: t.oneId,
      rebateRate: talentRebateRates[t.key],
    }));

    setSettingRebate(true);

    try {
      const response = await batchSetIndependentRebate({
        platform: selectedPlatform,
        talents: talentList,
      });

      if (response.success && response.data) {
        const { updated, failed } = response.data;
        if (updated > 0) {
          message.success(`成功为 ${updated} 个达人设置独立返点`);
          // 刷新列表
          loadTalents(talentPage);
          onSuccess?.();
        }
        if (failed > 0) {
          message.warning(`${failed} 个达人设置失败`);
        }
      } else {
        message.error(response.message || '设置失败');
      }
    } catch (error) {
      logger.error('设置返点失败:', error);
      message.error('设置返点失败，请稍后重试');
    } finally {
      setSettingRebate(false);
    }
  };

  // 平台切换时重新加载数据
  useEffect(() => {
    if (isOpen && agency) {
      loadCurrentConfig(selectedPlatform);
      if (activeTab === 'history') {
        loadHistory(1);
      }
      if (activeTab === 'independent') {
        loadTalents(1);
      }
    }
  }, [selectedPlatform, isOpen, agency]);

  // Tab 切换时加载对应数据
  useEffect(() => {
    if (isOpen && agency) {
      if (activeTab === 'history') {
        loadHistory(1);
      }
      if (activeTab === 'independent') {
        loadTalents(1);
      }
    }
  }, [activeTab, isOpen, agency, loadTalents]);

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
        <span className="font-semibold text-success-600 dark:text-success-400">
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
        <span
          className={
            sync
              ? 'text-success-600 dark:text-success-400'
              : 'text-content-muted'
          }
        >
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
                  <div className="text-xs text-content-secondary mb-1">
                    当前返点率
                  </div>
                  <div className="text-2xl font-bold text-primary-600">
                    {formatRebateRate(currentConfig.rebateRate)}
                  </div>
                </div>
                <div className="p-4 bg-surface-base rounded-lg">
                  <div className="text-xs text-content-secondary mb-1">
                    生效日期
                  </div>
                  <div className="text-base font-medium text-content">
                    {currentConfig.effectiveDate || '-'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-content-secondary">
                    最后更新时间
                  </div>
                  <div className="text-sm text-content">
                    {currentConfig.lastUpdatedAt
                      ? new Date(currentConfig.lastUpdatedAt).toLocaleString(
                          'zh-CN'
                        )
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-content-secondary">更新人</div>
                  <div className="text-sm text-content">
                    {currentConfig.updatedBy || '-'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert
              message="尚未配置"
              description={`该机构在${platformNames[selectedPlatform] || selectedPlatform}平台还未配置返点率，请前往"统一返点"标签进行设置。`}
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          )}
        </ProCard>
      ),
    },
    {
      key: 'unified',
      label: '统一返点',
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
                  suffix: '%',
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
              description='统一返点适用于所有"同步模式"的达人。如需为部分达人设置不同返点率，请使用"独立返点"功能。'
              type="warning"
              showIcon
              className="mt-4"
            />
          </ProForm>
        </ProCard>
      ),
    },
    {
      key: 'independent',
      label: '独立返点',
      children: (
        <ProCard>
          <div className="space-y-4">
            {/* 说明 */}
            <Alert
              message="独立返点说明"
              description="为机构达人设置独立返点后，该达人将不再跟随机构统一返点变化，但仍保持在机构内。适用于需要差异化返点的达人。"
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />

            {/* 工具栏 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-content-secondary">
                共{' '}
                <span className="font-medium text-content">{talentTotal}</span>{' '}
                个达人，已选择{' '}
                <span className="font-medium text-content">{selectedCount}</span>{' '}
                个
              </div>
              <div className="flex gap-2">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadTalents(talentPage)}
                  loading={talentsLoading}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  disabled={selectedCount === 0}
                  loading={settingRebate}
                  onClick={handleSetIndependentRebate}
                >
                  应用选中 ({selectedCount})
                </Button>
              </div>
            </div>

            {/* 达人表格 */}
            <Table
              dataSource={talents}
              rowKey="key"
              size="small"
              loading={talentsLoading}
              pagination={{
                current: talentPage,
                pageSize: talentPageSize,
                total: talentTotal,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: t => `共 ${t} 条`,
                onChange: (page) => loadTalents(page),
              }}
              scroll={{ y: 300 }}
              locale={{
                emptyText: (
                  <Empty description="该机构在此平台暂无达人" />
                ),
              }}
              columns={[
                {
                  title: (
                    <Checkbox
                      checked={talents.length > 0 && talents.every(t => t.selected)}
                      indeterminate={
                        talents.some(t => t.selected) && !talents.every(t => t.selected)
                      }
                      onChange={e => toggleSelectAll(e.target.checked)}
                      disabled={talents.length === 0}
                    />
                  ),
                  dataIndex: 'selected',
                  key: 'selected',
                  width: 50,
                  render: (_, record: TalentWithUI) => (
                    <Checkbox
                      checked={record.selected}
                      onChange={() => toggleSelection(record.key)}
                    />
                  ),
                },
                {
                  title: '达人昵称',
                  dataIndex: 'name',
                  key: 'name',
                  width: 120,
                  ellipsis: true,
                },
                {
                  title: '平台ID',
                  dataIndex: 'platformAccountId',
                  key: 'platformAccountId',
                  width: 120,
                  ellipsis: true,
                },
                {
                  title: '返点模式',
                  key: 'rebateMode',
                  width: 90,
                  render: (_, record: TalentWithUI) => {
                    const mode = record.rebateMode || 'sync';
                    return (
                      <Tag color={mode === 'independent' ? 'orange' : 'blue'}>
                        {mode === 'independent' ? '独立' : '同步'}
                      </Tag>
                    );
                  },
                },
                {
                  title: '当前返点',
                  key: 'currentRate',
                  width: 80,
                  render: (_, record: TalentWithUI) => {
                    const rate = record.currentRebate?.rate;
                    return rate !== undefined && rate !== null
                      ? `${rate}%`
                      : '-';
                  },
                },
                {
                  title: '新返点率',
                  key: 'newRate',
                  width: 130,
                  render: (_, record: TalentWithUI) => (
                    <InputNumber
                      value={talentRebateRates[record.key]}
                      onChange={value =>
                        setTalentRebateRates(prev => ({
                          ...prev,
                          [record.key]: value ?? 0,
                        }))
                      }
                      min={REBATE_VALIDATION.min}
                      max={REBATE_VALIDATION.max}
                      precision={2}
                      addonAfter="%"
                      size="small"
                      style={{ width: '100%' }}
                    />
                  ),
                },
              ]}
            />
          </div>
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
                <div className="text-xs text-content-secondary">
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
              description={`该机构在${platformNames[selectedPlatform] || selectedPlatform}平台还没有返点调整记录。`}
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
          <div className="text-xs font-normal text-content-secondary mt-1">
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
        <label className="block text-sm font-medium text-content mb-2">
          选择平台
        </label>
        <Select
          value={selectedPlatform}
          onChange={value => setSelectedPlatform(value)}
          style={{ width: 200 }}
          options={supportedPlatforms.map(platform => ({
            value: platform,
            label: platformNames[platform] || platform,
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
