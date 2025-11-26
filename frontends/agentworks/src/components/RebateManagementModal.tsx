/**
 * 返点管理弹窗 - v2.0 (Ant Design Pro + Tailwind 升级版)
 *
 * 升级要点：
 * 1. 使用 Modal 替代手写弹窗容器
 * 2. 使用 Tabs 组件替代手写 Tab 导航
 * 3. 使用 ProCard 组织内容区域
 * 4. 使用 ProForm + ProFormDigit 管理手动调整表单
 * 5. 使用 Switch 替代手写 Toggle
 * 6. 使用 Alert 替代手写提示框
 * 7. 使用 message 替代 Toast
 */

import { Modal, Tabs, Switch, Alert, Button, Skeleton } from 'antd';
import { InfoCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { ProCard, ProForm, ProFormDigit, ProFormText, ProFormRadio } from '@ant-design/pro-components';
import type { Talent } from '../types/talent';
import type { EffectType } from '../types/rebate';
import {
  REBATE_SOURCE_LABELS,
  formatRebateRate,
  EFFECT_TYPE_LABELS,
  REBATE_VALIDATION,
} from '../types/rebate';
import { RebateHistoryList } from './RebateHistoryList';
import {
  isWildTalent,
  getRebateTabs,
  getTabDisplayName,
  isPhaseTab,
  getBusinessAttribute
} from '../utils/rebate';
import { useRebateForm, type TabType } from '../hooks/features/useRebateForm';

interface RebateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  talent: Talent;
}

export function RebateManagementModal({
  isOpen,
  onClose,
  talent,
}: RebateManagementModalProps) {
  // 使用 useRebateForm hook 管理所有业务逻辑
  const {
    rebateData,
    rebateHistory,
    rebateLoading,
    activeTab,
    setActiveTab,
    rebateMode,
    manualRebateRate,
    setManualRebateRate,
    manualEffectType,
    setManualEffectType,
    manualCreatedBy,
    setManualCreatedBy,
    manualLoading,
    handleManualSubmit,
    handleManualReset,
    syncLoading,
    handleSyncFromAgency,
    handleToggleMode,
    manualError,
    successMessage,
    currentPage,
    totalPages,
    totalRecords,
    handlePrevPage,
    handleNextPage,
    getAgencyName,
  } = useRebateForm({ talent, isOpen });

  if (!isOpen) return null;

  // 构建 Tabs 配置
  const tabItems = getRebateTabs({ ...talent, rebateMode }).map((tab) => ({
    key: tab,
    label: (
      <span className="flex items-center gap-2">
        {getTabDisplayName(tab)}
        {isPhaseTab(tab) && (
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
            Phase 2
          </span>
        )}
      </span>
    ),
    disabled: isPhaseTab(tab),
    children: null, // 内容在下方统一渲染
  }));

  return (
    <Modal
      title={
        <div>
          <div className="text-lg font-semibold">
            返点管理: <span className="text-green-600">{talent.name}</span>
          </div>
          <div className="text-sm font-normal text-gray-500 mt-0.5">
            {isWildTalent(talent) ? '野生达人' : '机构达人'} · 查看和调整达人的返点配置
          </div>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>关闭</Button>
        </div>
      }
      width={900}
      destroyOnHidden
      centered
    >
      {/* Tabs 导航 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
        items={tabItems}
        className="mb-4"
      />

      {/* Tab 内容 */}
      {rebateLoading ? (
        <ProCard>
          <Skeleton active paragraph={{ rows: 4 }} />
        </ProCard>
      ) : rebateData ? (
        <div className="space-y-4">
          {/* Tab: 当前配置 */}
          {activeTab === 'current' && (
            <div className="space-y-4">
              {/* 当前返点信息 */}
              <ProCard title="当前返点配置" headerBordered>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">商业属性</p>
                    <p className="mt-1 text-base font-medium text-gray-900">
                      {getBusinessAttribute(talent, getAgencyName(rebateData.agencyId))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">当前返点率</p>
                    <p className="mt-1 text-base font-bold text-green-600">
                      {formatRebateRate(rebateData.currentRebate.rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">返点来源</p>
                    <p className="mt-1 text-base font-medium text-gray-900">
                      {rebateMode === 'sync' && !isWildTalent(talent)
                        ? '机构同步'
                        : REBATE_SOURCE_LABELS[rebateData.currentRebate.source]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">生效日期</p>
                    <p className="mt-1 text-base font-medium text-gray-900">
                      {rebateData.currentRebate.effectiveDate}
                    </p>
                  </div>
                </div>
              </ProCard>

              {/* 机构达人：返点模式切换 */}
              {!isWildTalent(talent) && (
                <ProCard title="返点模式" headerBordered>
                  <div className="space-y-4">
                    {/* 模式切换 */}
                    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {rebateMode === 'sync' ? '绑定机构返点' : '独立设置返点'}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {rebateMode === 'sync'
                            ? `当前绑定机构"${rebateData?.agencyName}"的返点配置，机构调整时自动同步`
                            : '当前使用独立设置，不跟随机构返点变化'}
                        </p>
                      </div>
                      <Switch
                        checked={rebateMode === 'sync'}
                        onChange={handleToggleMode}
                        checkedChildren="绑定机构"
                        unCheckedChildren="独立设置"
                      />
                    </div>

                    {/* 说明信息 */}
                    <Alert
                      message="关于返点模式"
                      description={
                        <ul className="text-xs space-y-1 list-disc list-inside mt-2">
                          <li><strong>绑定机构返点：</strong>返点率跟随机构配置，机构调整时自动同步。切换后请前往"机构同步" Tab进行同步操作</li>
                          <li><strong>独立设置返点：</strong>使用自定义返点率，不受机构变化影响。切换后请前往"手动调整" Tab进行配置</li>
                        </ul>
                      }
                      type="info"
                      showIcon
                      icon={<InfoCircleOutlined />}
                    />
                  </div>
                </ProCard>
              )}
            </div>
          )}

          {/* Tab: 手动调整 */}
          {activeTab === 'manual' && (
            <ProCard title="手动调整返点" headerBordered>
              {/* 成功提示 */}
              {successMessage && (
                <Alert
                  message={successMessage}
                  type="success"
                  showIcon
                  closable
                  className="mb-4"
                />
              )}

              {/* 当前返点率展示 */}
              <div className="rounded-lg bg-gray-50 p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">当前返点率</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {rebateData?.currentRebate?.rate?.toFixed(2) || '0.00'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">当前生效日期</p>
                    <p className="mt-1 text-base font-medium text-gray-700">
                      {rebateData?.currentRebate?.effectiveDate || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 表单 */}
              <ProForm
                onFinish={async () => {
                  // 适配器：ProForm 传递的是 values，但 handleManualSubmit 期望 event
                  // 由于 handleManualSubmit 从 state 读取值，我们创建一个假的 event 对象
                  const fakeEvent = {
                    preventDefault: () => { },
                  } as React.FormEvent;
                  await handleManualSubmit(fakeEvent);
                }}
                submitter={{
                  searchConfig: {
                    submitText: '确认调整',
                    resetText: '重置',
                  },
                  submitButtonProps: {
                    loading: manualLoading,
                  },
                  resetButtonProps: {
                    onClick: handleManualReset,
                  },
                }}
                layout="vertical"
              >
                {/* 新返点率输入 */}
                <ProFormDigit
                  name="rebateRate"
                  label="新返点率"
                  placeholder="请输入返点率"
                  rules={[
                    { required: true, message: '请输入返点率' },
                    { type: 'number', min: REBATE_VALIDATION.min, max: REBATE_VALIDATION.max, message: `返点率必须在 ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max}% 之间` },
                  ]}
                  fieldProps={{
                    value: manualRebateRate ? parseFloat(manualRebateRate) : undefined,
                    onChange: (value) => setManualRebateRate(value?.toString() || ''),
                    precision: REBATE_VALIDATION.precision,
                    min: REBATE_VALIDATION.min,
                    max: REBATE_VALIDATION.max,
                    step: REBATE_VALIDATION.step,
                    addonAfter: '%',
                    size: 'middle',
                  }}
                  extra={`范围: ${REBATE_VALIDATION.min}-${REBATE_VALIDATION.max}%，最多${REBATE_VALIDATION.precision}位小数`}
                />

                {/* 生效方式 */}
                <ProFormRadio.Group
                  name="effectType"
                  label="生效方式"
                  rules={[{ required: true, message: '请选择生效方式' }]}
                  initialValue={manualEffectType}
                  fieldProps={{
                    value: manualEffectType,
                    onChange: (e) => setManualEffectType(e.target.value as EffectType),
                  }}
                  options={[
                    {
                      label: (
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {EFFECT_TYPE_LABELS.immediate}
                          </div>
                          <div className="text-xs text-gray-500">
                            更新后立即生效，下次合作使用新返点率
                          </div>
                        </div>
                      ),
                      value: 'immediate',
                    },
                    {
                      label: (
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {EFFECT_TYPE_LABELS.next_cooperation}
                            <span className="text-orange-600 text-xs ml-2">(暂不支持)</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            创建待生效配置，等待下次合作时激活
                          </div>
                        </div>
                      ),
                      value: 'next_cooperation',
                      disabled: true,
                    },
                  ]}
                />

                {/* 操作人 */}
                <ProFormText
                  name="createdBy"
                  label={
                    <span>
                      操作人
                      <span className="ml-1 text-xs text-gray-500">(选填)</span>
                    </span>
                  }
                  placeholder="默认为 system"
                  fieldProps={{
                    value: manualCreatedBy,
                    onChange: (e) => setManualCreatedBy(e.target.value),
                    size: 'middle',
                  }}
                />

                {/* 错误提示 */}
                {manualError && (
                  <Alert
                    message={manualError}
                    type="error"
                    showIcon
                    closable
                  />
                )}
              </ProForm>
            </ProCard>
          )}

          {/* Tab: 机构同步 */}
          {activeTab === 'agencySync' && !isWildTalent(talent) && (
            <ProCard title="机构同步配置" headerBordered>
              {/* 成功提示 */}
              {successMessage && (
                <Alert
                  message={successMessage}
                  type="success"
                  showIcon
                  closable
                  className="mb-4"
                />
              )}

              <div className="space-y-4">
                {/* 机构信息展示 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">归属机构</p>
                    <p className="mt-1 text-base font-medium text-gray-900">
                      {getAgencyName(talent.agencyId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">当前返点率</p>
                    <p className="mt-1 text-base font-bold text-green-600">
                      {rebateData ? formatRebateRate(rebateData.currentRebate.rate) : '0%'}
                    </p>
                  </div>
                </div>

                {/* 同步按钮 */}
                <div className="border-t pt-4">
                  <Button
                    type="primary"
                    icon={<SyncOutlined spin={syncLoading} />}
                    onClick={handleSyncFromAgency}
                    loading={syncLoading}
                    block
                    size="large"
                  >
                    {syncLoading ? '同步中...' : `从机构"${rebateData?.agencyName}"同步返点`}
                  </Button>
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    点击后将使用机构在该平台的当前返点配置
                  </p>
                </div>

                {/* 错误提示 */}
                {manualError && (
                  <Alert
                    message={manualError}
                    type="error"
                    showIcon
                    closable
                  />
                )}

                {/* 说明信息 */}
                <Alert
                  message="关于机构同步"
                  description={
                    <>
                      同步操作将从机构在该平台的当前返点配置中获取返点率，并立即应用到当前达人。
                      同步后，该达人将保持在&quot;绑定机构返点&quot;模式，后续机构返点变更时会自动同步。
                    </>
                  }
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                />
              </div>
            </ProCard>
          )}

          {/* Tab: 阶梯规则 (Phase 2) */}
          {activeTab === 'stepRule' && (
            <ProCard title="阶梯规则配置" headerBordered>
              <div className="py-8 text-center text-gray-400">
                <p>阶梯规则功能将在 Phase 2 开放</p>
              </div>
            </ProCard>
          )}

          {/* Tab: 调整历史 */}
          {activeTab === 'history' && (
            <ProCard title="调整历史" headerBordered>
              <RebateHistoryList
                records={rebateHistory}
                loading={rebateLoading}
                showPagination={true}
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
              />
            </ProCard>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-gray-500">
          暂无返点配置信息
        </div>
      )}
    </Modal>
  );
}
