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
import { SettingOutlined, DatabaseOutlined, RightOutlined } from '@ant-design/icons';
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
      icon: <DatabaseOutlined className="text-2xl text-blue-600" />,
      path: '/settings/performance-config',
      status: 'active',
    },
    {
      key: 'platform-config',
      title: '平台配置管理',
      description: '管理系统支持的平台及其相关配置，支持动态调整无需重新部署',
      icon: <SettingOutlined className="text-2xl text-green-600" />,
      path: '/settings/platform-config',
      status: 'beta',
    },
  ];

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">稳定</span>;
      case 'beta':
        return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">Beta</span>;
      case 'coming':
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">即将上线</span>;
      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-1 text-sm text-gray-500">
            配置系统参数，管理平台和功能设置
          </p>
        </div>

        {/* 设置项卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingItems.map((item) => (
            <ProCard
              key={item.key}
              hoverable
              className="cursor-pointer"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg">
                  {item.icon}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    {getStatusTag(item.status)}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* 箭头 */}
                <div className="flex-shrink-0">
                  <RightOutlined className="text-gray-400" />
                </div>
              </div>
            </ProCard>
          ))}
        </div>

        {/* 提示信息 */}
        <ProCard className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <SettingOutlined className="text-blue-600 text-lg mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                关于系统设置
              </h4>
              <p className="text-xs text-blue-700">
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
