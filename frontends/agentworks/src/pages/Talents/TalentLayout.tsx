/**
 * 达人管理布局组件
 */

import { NavLink, Outlet } from 'react-router-dom';
import {
  UserGroupIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface TabItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { name: '基础信息', path: '/talents/basic', icon: InformationCircleIcon },
  // 未来可以添加更多子页面
  // { name: '档期管理', path: '/talents/schedule', icon: CalendarIcon },
  // { name: '近期表现', path: '/talents/performance', icon: ChartBarIcon },
];

export function TalentLayout() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">达人管理</h1>
        </div>
        <p className="mt-2 text-lg text-gray-600">
          管理多平台达人信息，查看达人数据和表现
        </p>
      </div>

      {/* 子页面导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon
                    className={`-ml-0.5 mr-2 h-5 w-5 ${
                      isActive
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {tab.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 子页面内容 */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}
