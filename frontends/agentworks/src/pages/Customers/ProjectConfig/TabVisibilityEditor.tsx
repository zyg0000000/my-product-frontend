/**
 * Tab 可见性配置编辑器
 * 控制项目详情页显示哪些 Tab
 *
 * 设计系统：统一配置编辑器风格
 */

import { Switch } from 'antd';
import {
  TeamOutlined,
  ScheduleOutlined,
  DollarOutlined,
  LineChartOutlined,
  FormOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type {
  TabVisibilityConfig,
  ProjectTabKey,
} from '../../../types/projectConfig';
import { PROJECT_TABS_METADATA } from '../../../types/projectConfig';
import './ConfigEditor.css';

interface TabVisibilityEditorProps {
  value: TabVisibilityConfig;
  onChange: (config: TabVisibilityConfig) => void;
  disabled?: boolean;
}

const TAB_ICONS: Record<ProjectTabKey, React.ReactNode> = {
  collaborations: <TeamOutlined />,
  execution: <ScheduleOutlined />,
  finance: <DollarOutlined />,
  effect: <LineChartOutlined />,
  registration: <FormOutlined />,
};

const TAB_COLORS: Record<ProjectTabKey, string> = {
  collaborations: 'primary',
  execution: 'warning',
  finance: 'success',
  effect: 'purple',
  registration: 'cyan',
};

export function TabVisibilityEditor({
  value,
  onChange,
  disabled,
}: TabVisibilityEditorProps) {
  const handleToggle = (key: ProjectTabKey, enabled: boolean) => {
    onChange({ ...value, [key]: enabled });
  };

  const tabKeys: ProjectTabKey[] = [
    'collaborations',
    'execution',
    'finance',
    'effect',
    'registration',
  ];

  // 计算启用的 Tab 数量
  const enabledCount = Object.values(value).filter(Boolean).length;

  return (
    <div
      className={`config-editor ${disabled ? 'config-editor--disabled' : ''}`}
    >
      {disabled && (
        <div className="config-warning">
          <SafetyCertificateOutlined />
          请先开启「启用自定义项目配置」开关
        </div>
      )}

      {/* 区块标题 */}
      <div className="config-section">
        <div className="config-section__header">
          <div className="config-section__icon">
            <EyeOutlined />
          </div>
          <div>
            <h4 className="config-section__title">Tab 显示控制</h4>
            <p className="config-section__desc">
              控制项目详情页显示哪些功能模块，关闭的 Tab
              对该客户的所有项目不可见
            </p>
          </div>
        </div>

        {/* Tab 卡片网格 */}
        <div className="config-feature-grid">
          {tabKeys.map(key => {
            const meta = PROJECT_TABS_METADATA[key];
            const isEnabled = value[key];
            const colorClass = TAB_COLORS[key];

            return (
              <div
                key={key}
                className={`config-feature-card ${isEnabled ? 'config-feature-card--active' : ''}`}
                onClick={() => !disabled && handleToggle(key, !isEnabled)}
              >
                <div className="config-feature-card__header">
                  <div
                    className={`config-feature-card__icon config-feature-card__icon--${colorClass}`}
                  >
                    {TAB_ICONS[key]}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={isEnabled}
                      onChange={checked => handleToggle(key, checked)}
                      disabled={disabled}
                      size="small"
                    />
                  </div>
                </div>
                <h5 className="config-feature-card__title">{meta.label}</h5>
                <p className="config-feature-card__desc">{meta.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 错误提示 */}
      {enabledCount === 0 && (
        <div className="config-warning config-warning--error">
          <SafetyCertificateOutlined />
          至少需要保留一个可见的 Tab
        </div>
      )}

      {/* 底部计数 */}
      <div className="config-footer">
        <span className="config-footer__count">
          当前已启用 <strong>{enabledCount}</strong> 个功能模块
        </span>
      </div>
    </div>
  );
}
