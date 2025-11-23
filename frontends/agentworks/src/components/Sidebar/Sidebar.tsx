/**
 * 侧边栏组件
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: SubNavItem[];
}

interface SubNavItem {
  name: string;
  path: string;
}

const navigation: NavItem[] = [
  { name: '首页', path: '/', icon: HomeIcon },
  {
    name: '达人管理',
    path: '/talents',
    icon: UsersIcon,
    children: [
      { name: '基础信息', path: '/talents/basic' },
      { name: '机构管理', path: '/talents/agencies' },
      { name: '近期表现', path: '/performance' },
    ],
  },
  {
    name: '客户管理',
    path: '/customers',
    icon: BuildingOfficeIcon,
    children: [
      { name: '客户列表', path: '/customers/list' },
    ],
  },
  { name: '项目管理', path: '/projects', icon: FolderIcon },
  { name: '数据分析', path: '/analytics', icon: ChartBarIcon },
  {
    name: '系统设置',
    path: '/settings',
    icon: Cog6ToothIcon,
    children: [
      { name: '达人数据表现配置', path: '/settings/performance-config' },
      { name: '平台配置管理', path: '/settings/platform-config' },
    ],
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['达人管理', '客户管理', '系统设置']);
  const location = useLocation();

  const toggleMenu = (menuName: string) => {
    if (isCollapsed) return; // 折叠状态下不展开子菜单
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);

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
        {navigation.map(item => {
          // 如果有子菜单
          if (item.children) {
            const isExpanded = isMenuExpanded(item.name);
            const isActive =
              location.pathname === item.path ||
              item.children.some(child => location.pathname === child.path);

            // 折叠状态：整个区域可点击跳转
            if (isCollapsed) {
              return (
                <NavLink
                  key={item.name}
                  to={item.path!}
                  className={({ isActive }) =>
                    `flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                  title={item.name}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                </NavLink>
              );
            }

            // 展开状态：分离点击区域
            return (
              <div key={item.name}>
                {/* 父级菜单：左侧跳转，右侧展开/收起 */}
                <div
                  className={`flex items-center gap-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {/* 左侧：跳转到一级页面 */}
                  <NavLink
                    to={item.path!}
                    className="flex flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                  </NavLink>

                  {/* 右侧：展开/收起子菜单 */}
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="px-2 py-2.5"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* 子菜单 */}
                {isExpanded && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-gray-700 pl-3">
                    {item.children.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-primary-600 text-white font-medium'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`
                        }
                      >
                        <span className="text-xs">·</span>
                        <span>{child.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // 没有子菜单的普通菜单项
          return (
            <NavLink
              key={item.path}
              to={item.path!}
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
          );
        })}
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
