/**
 * 侧边栏组件
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: '首页', path: '/', icon: HomeIcon },
  { name: '达人管理', path: '/talents/basic', icon: UsersIcon },
  { name: '项目管理', path: '/projects', icon: FolderIcon },
  { name: '数据分析', path: '/analytics', icon: ChartBarIcon },
  { name: '系统设置', path: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`flex h-screen flex-col bg-gray-900 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-white">AgentWorks</h1>
        )}
        {isCollapsed && (
          <h1 className="text-xl font-bold text-white">AW</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.name : ''}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="border-t border-gray-800 p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5 flex-shrink-0" />
              <span className="ml-2 text-sm">折叠</span>
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="border-t border-gray-800 p-4">
          <div className="text-xs text-gray-400">
            <p>AgentWorks v2.0</p>
            <p className="mt-1">多平台达人管理系统</p>
          </div>
        </div>
      )}
    </div>
  );
}
