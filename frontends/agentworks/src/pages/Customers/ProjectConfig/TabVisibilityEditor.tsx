/**
 * Tab 可见性配置编辑器
 * 控制项目详情页显示哪些 Tab
 */

import { Card, Switch } from 'antd';
import {
  TeamOutlined,
  ScheduleOutlined,
  DollarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type {
  TabVisibilityConfig,
  ProjectTabKey,
} from '../../../types/projectConfig';
import { PROJECT_TABS_METADATA } from '../../../types/projectConfig';

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
  ];

  // 计算启用的 Tab 数量
  const enabledCount = Object.values(value).filter(Boolean).length;

  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-gray-500 mb-4">
        控制项目详情页显示哪些 Tab，关闭的 Tab 对该客户的所有项目不可见
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tabKeys.map(key => {
          const meta = PROJECT_TABS_METADATA[key];
          const isEnabled = value[key];

          return (
            <Card
              key={key}
              size="small"
              className={`transition-all ${
                isEnabled
                  ? 'border-primary-200 bg-primary-50/30'
                  : 'border-gray-200 bg-gray-50/50'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      isEnabled
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {TAB_ICONS[key]}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {meta.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {meta.description}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={checked => handleToggle(key, checked)}
                  disabled={disabled}
                  checkedChildren="显示"
                  unCheckedChildren="隐藏"
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* 提示：至少保留一个 Tab */}
      {enabledCount === 0 && (
        <div className="text-orange-500 text-sm mt-2 bg-orange-50 p-3 rounded-lg">
          提示：至少需要保留一个可见的 Tab
        </div>
      )}

      {enabledCount > 0 && (
        <div className="text-gray-400 text-xs mt-2">
          当前已启用 {enabledCount} 个 Tab
        </div>
      )}
    </div>
  );
}
