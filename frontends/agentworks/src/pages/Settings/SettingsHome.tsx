/**
 * 系统设置模块首页 - Ant Design Pro 版本
 *
 * 版本: v2.0.0
 * 更新时间: 2025-11-23
 *
 * 功能说明：
 * - 展示所有可用的设置项
 * - 卡片式导航设计
 * - 提供快速访问入口
 */

import { useNavigate } from 'react-router-dom';
import { ProCard } from '@ant-design/pro-components';
import {
  SettingOutlined,
  DatabaseOutlined,
  RightOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../components/PageTransition';

interface SettingItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  status: 'active' | 'beta' | 'coming';
}

export function SettingsHome() {
  const navigate = useNavigate();

  const settingItems: SettingItem[] = [
    {
      key: 'performance-config',
      title: '达人数据表现配置',
      description: '配置达人表现数据的维度、字段映射和计算规则',
      icon: <DatabaseOutlined className="text-2xl text-primary-600" />,
      path: '/settings/performance-config',
      status: 'active',
    },
    {
      key: 'platform-config',
      title: '平台配置管理',
      description: '管理系统支持的平台及其相关配置，支持动态调整无需重新部署',
      icon: <SettingOutlined className="text-2xl text-success-600 dark:text-success-400" />,
      path: '/settings/platform-config',
      status: 'beta',
    },
    {
      key: 'tag-management',
      title: '达人标签配置',
      description: '管理达人重要程度等级和业务标签，标签配置全局生效',
      icon: <TagsOutlined className="text-2xl text-purple-600" />,
      path: '/settings/tag-management',
      status: 'active',
    },
  ];

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded">
            稳定
          </span>
        );
      case 'beta':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
            Beta
          </span>
        );
      case 'coming':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-surface-sunken text-content-secondary rounded">
            即将上线
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">系统设置</h1>
          <p className="mt-1 text-sm text-content-secondary">
            配置系统参数，管理平台和功能设置
          </p>
        </div>

        {/* 设置项卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingItems.map(item => (
            <ProCard
              key={item.key}
              hoverable
              className="cursor-pointer"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface-base rounded-lg">
                  {item.icon}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-content">
                      {item.title}
                    </h3>
                    {getStatusTag(item.status)}
                  </div>
                  <p className="text-sm text-content-secondary line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* 箭头 */}
                <div className="flex-shrink-0">
                  <RightOutlined className="text-content-muted" />
                </div>
              </div>
            </ProCard>
          ))}
        </div>

        {/* 提示信息 */}
        <ProCard className="alert-info">
          <div className="flex items-start gap-3">
            <SettingOutlined className="text-primary-600 text-lg mt-0.5" />
            <div>
              <h4 className="alert-info-title mb-1">关于系统设置</h4>
              <p className="alert-info-text">
                系统设置模块用于管理 AgentWorks 的全局配置和参数。
                配置修改后会立即生效，部分配置可能需要刷新页面才能看到效果。
              </p>
            </div>
          </div>
        </ProCard>
      </div>
    </PageTransition>
  );
}
