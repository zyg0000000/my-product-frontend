/**
 * 财务管理配置编辑器
 *
 * 设计系统：统一配置编辑器风格
 * 功能：
 * - 资金占用费用开关及费率配置
 * - 结算文件管理开关
 * - 调整项类型配置
 */

import { useState } from 'react';
import { InputNumber, Tag, Switch, Tooltip, Input, Button, Space } from 'antd';
import {
  FundOutlined,
  FileOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { FinanceTabConfig } from '../../../types/projectConfig';
import {
  DEFAULT_FINANCE_CONFIG,
  DEFAULT_ADJUSTMENT_TYPES,
} from '../../../types/projectConfig';
import './ConfigEditor.css';

interface FinanceConfigEditorProps {
  value?: FinanceTabConfig;
  onChange: (config: FinanceTabConfig) => void;
  disabled?: boolean;
}

export function FinanceConfigEditor({
  value,
  onChange,
  disabled,
}: FinanceConfigEditorProps) {
  const config: FinanceTabConfig = value || DEFAULT_FINANCE_CONFIG;
  const [newAdjustmentType, setNewAdjustmentType] = useState('');

  // 调整项类型（使用配置值或默认值）
  const adjustmentTypes = config.adjustmentTypes || DEFAULT_ADJUSTMENT_TYPES;

  const handleFundsOccupationToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enableFundsOccupation: enabled,
    });
  };

  const handleFundsRateChange = (rate: number | null) => {
    onChange({
      ...config,
      fundsOccupationRate: rate ?? 0.7,
    });
  };

  const handleSettlementFilesToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enableSettlementFiles: enabled,
    });
  };

  const handleAddAdjustmentType = () => {
    const trimmed = newAdjustmentType.trim();
    if (trimmed && !adjustmentTypes.includes(trimmed)) {
      onChange({
        ...config,
        adjustmentTypes: [...adjustmentTypes, trimmed],
      });
      setNewAdjustmentType('');
    }
  };

  const handleRemoveAdjustmentType = (type: string) => {
    // 至少保留一个类型
    if (adjustmentTypes.length <= 1) return;
    onChange({
      ...config,
      adjustmentTypes: adjustmentTypes.filter(t => t !== type),
    });
  };

  return (
    <div
      className={`config-editor ${disabled ? 'config-editor--disabled' : ''}`}
    >
      {disabled && (
        <div className="config-warning">
          <SafetyCertificateOutlined />
          财务管理 Tab 已关闭，请先在「Tab 显示配置」中开启
        </div>
      )}

      {/* 功能开关区 */}
      <section className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon config-section__icon--warning">
            <ThunderboltOutlined />
          </div>
          <div>
            <h4 className="config-section__title">财务功能配置</h4>
            <p className="config-section__desc">按需开启额外的财务管理功能</p>
          </div>
        </div>

        <div className="config-feature-grid">
          {/* 资金占用费用 */}
          <div
            className={`config-feature-card ${config.enableFundsOccupation ? 'config-feature-card--active' : ''}`}
          >
            <div className="config-feature-card__header">
              <div className="config-feature-card__icon config-feature-card__icon--danger">
                <FundOutlined />
              </div>
              <Switch
                checked={config.enableFundsOccupation}
                onChange={handleFundsOccupationToggle}
                disabled={disabled}
                size="small"
              />
            </div>
            <h5 className="config-feature-card__title">资金占用费用</h5>
            <p className="config-feature-card__desc">
              计算从下单到回款期间的资金占用成本
            </p>
            {config.enableFundsOccupation && (
              <div className="config-feature-card__extra">
                <label className="config-feature-card__label">
                  月费率
                  <Tooltip title="资金占用费用 = 支出金额 × (月费率/30) × 占用天数">
                    <InfoCircleOutlined
                      style={{ marginLeft: 4, color: '#94a3b8' }}
                    />
                  </Tooltip>
                </label>
                <InputNumber
                  value={config.fundsOccupationRate ?? 0.7}
                  onChange={handleFundsRateChange}
                  min={0}
                  max={10}
                  step={0.1}
                  precision={2}
                  addonAfter="%"
                  disabled={disabled}
                  className="w-full"
                  size="small"
                />
              </div>
            )}
          </div>

          {/* 结算文件管理 */}
          <div
            className={`config-feature-card ${config.enableSettlementFiles ? 'config-feature-card--active' : ''}`}
          >
            <div className="config-feature-card__header">
              <div className="config-feature-card__icon config-feature-card__icon--success">
                <FileOutlined />
              </div>
              <Switch
                checked={config.enableSettlementFiles}
                onChange={handleSettlementFilesToggle}
                disabled={disabled}
                size="small"
              />
            </div>
            <h5 className="config-feature-card__title">结算文件管理</h5>
            <p className="config-feature-card__desc">
              上传、预览、下载项目结算相关文件
            </p>
            {config.enableSettlementFiles && (
              <div className="config-feature-card__extra">
                <Tag color="success" style={{ margin: 0 }}>
                  支持 PDF/Excel/图片
                </Tag>
              </div>
            )}
          </div>

          {/* 调整项类型配置 */}
          <div className="config-feature-card config-feature-card--active">
            <div className="config-feature-card__header">
              <div className="config-feature-card__icon config-feature-card__icon--warning">
                <EditOutlined />
              </div>
              <span className="config-feature-card__badge">
                {adjustmentTypes.length} 个类型
              </span>
            </div>
            <h5 className="config-feature-card__title">调整项类型</h5>
            <p className="config-feature-card__desc">
              配置财务调整时可选的调整类型选项
            </p>
            <div className="config-feature-card__extra">
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {adjustmentTypes.map(type => (
                  <Tag
                    key={type}
                    closable={!disabled && adjustmentTypes.length > 1}
                    onClose={() => handleRemoveAdjustmentType(type)}
                    style={{ margin: 0 }}
                  >
                    {type}
                  </Tag>
                ))}
              </div>
              {!disabled && (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入新类型名称"
                    value={newAdjustmentType}
                    onChange={e => setNewAdjustmentType(e.target.value)}
                    onPressEnter={handleAddAdjustmentType}
                    size="small"
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddAdjustmentType}
                    disabled={
                      !newAdjustmentType.trim() ||
                      adjustmentTypes.includes(newAdjustmentType.trim())
                    }
                    size="small"
                  >
                    添加
                  </Button>
                </Space.Compact>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 配置预览 */}
      <section className="config-preview" style={{ marginTop: 16 }}>
        <h4 className="config-preview__title">配置预览</h4>
        <div className="config-preview__tags">
          {config.enableFundsOccupation && (
            <Tag color="orange">
              资金占用费率: {config.fundsOccupationRate ?? 0.7}%/月
            </Tag>
          )}
          {config.enableSettlementFiles && (
            <Tag color="green">结算文件管理</Tag>
          )}
          <Tag color="purple">调整项类型: {adjustmentTypes.length} 个</Tag>
        </div>
      </section>
    </div>
  );
}

export default FinanceConfigEditor;
