/**
 * 侧边栏组件
 * 精致深色主题，与主内容区统一风格
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
      { name: '近期表现', path: '/performance/list' },
    ],
  },
  {
    name: '客户管理',
    path: '/customers',
    icon: BuildingOfficeIcon,
    children: [{ name: '客户列表', path: '/customers/list' }],
  },
  { name: '项目管理', path: '/projects', icon: FolderIcon },
  {
    name: '数据分析',
    path: '/analytics',
    icon: ChartBarIcon,
    children: [{ name: '达人效果趋势', path: '/analytics/talent-trends' }],
  },
  {
    name: '系统设置',
    path: '/settings',
    icon: Cog6ToothIcon,
    children: [
      { name: '达人表现配置', path: '/settings/performance-config' },
      { name: '平台配置', path: '/settings/platform-config' },
    ],
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    '达人管理',
    '客户管理',
    '数据分析',
    '系统设置',
  ]);
  const location = useLocation();

  const toggleMenu = (menuName: string) => {
    if (isCollapsed) return;
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName);

  return (
    <div
      className={`flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-48'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-center border-b border-gray-100">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
              AgentWorks
            </h1>
            <span className="text-[10px] text-gray-400 font-medium">v3.5</span>
          </div>
        ) : (
          <span className="text-lg font-bold text-primary-600">A</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map(item => {
            // 有子菜单
            if (item.children) {
              const isExpanded = isMenuExpanded(item.name);
              const isParentActive = location.pathname === item.path;
              const hasActiveChild = item.children.some(
                child => location.pathname === child.path
              );
              const isActive = isParentActive || hasActiveChild;

              // 折叠状态
              if (isCollapsed) {
                return (
                  <NavLink
                    key={item.name}
                    to={item.path!}
                    className={`group flex items-center justify-center rounded-lg p-2.5 transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                    title={item.name}
                  >
                    <item.icon
                      className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${
                        isActive ? 'text-primary-600' : ''
                      }`}
                    />
                  </NavLink>
                );
              }

              // 展开状态
              return (
                <div key={item.name} className="space-y-0.5">
                  {/* 父级菜单 */}
                  <div
                    className={`group flex items-center rounded-lg transition-all duration-200 ${
                      isActive ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <NavLink
                      to={item.path!}
                      className={`flex flex-1 items-center gap-3 px-3 py-2.5 text-[13px] font-medium ${
                        isActive
                          ? 'text-primary-600'
                          : 'text-gray-600 group-hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-105 ${
                          isActive
                            ? 'text-primary-600'
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                      <span>{item.name}</span>
                    </NavLink>

                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`mr-2 p-1 rounded transition-colors ${
                        isActive
                          ? 'text-primary-500 hover:bg-primary-100'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {/* 子菜单 - 带动画 */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 space-y-0.5 border-l border-gray-100 pl-3 py-1">
                      {item.children.map(child => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={`group flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-all duration-200 ${
                              isChildActive
                                ? 'bg-primary-600 text-white font-medium shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                                isChildActive
                                  ? 'bg-white'
                                  : 'bg-gray-300 group-hover:bg-primary-400'
                              }`}
                            />
                            <span>{child.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // 无子菜单
            return (
              <NavLink
                key={item.path}
                to={item.path!}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? item.name : ''}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-105 ${
                        isActive
                          ? 'text-primary-600'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* 折叠按钮 */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-50 hover:text-gray-600"
          title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="text-xs">收起</span>
            </>
          )}
        </button>
      </div>

      {/* 底部信息 */}
      {!isCollapsed && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">v3.5.0</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-gray-400">在线</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
