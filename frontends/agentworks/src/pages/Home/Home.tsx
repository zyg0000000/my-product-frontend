/**
 * 首页
 */

import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';

export function Home() {
  const navigate = useNavigate();

  const quickActions = [
    {
      name: '达人管理',
      description: '查看和管理多平台达人信息',
      icon: UsersIcon,
      path: '/talents',
      color: 'bg-primary-500',
    },
    {
      name: '客户管理',
      description: '管理客户信息和合作关系',
      icon: BuildingOfficeIcon,
      path: '/clients',
      color: 'bg-orange-500',
    },
    {
      name: '项目管理',
      description: '管理广告投放项目',
      icon: FolderIcon,
      path: '/projects',
      color: 'bg-green-500',
    },
    {
      name: '数据分析',
      description: '查看项目和达人数据分析',
      icon: ChartBarIcon,
      path: '/analytics',
      color: 'bg-purple-500',
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* 欢迎信息 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            欢迎使用 AgentWorks
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            多平台广告代理项目管理系统
          </p>
        </div>

        {/* 快速操作 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
          <div className="mt-4 grid gap-6 grid-cols-1 sm:grid-cols-2">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group relative flex flex-col items-start rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary-500 hover:shadow-lg"
              >
                <div className={`rounded-lg ${action.color} p-3`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {action.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {action.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 近期功能更新 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              近期功能更新
            </h2>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-800">
              v3.5.0
            </span>
          </div>
          <div className="mt-6 space-y-4">
            <div className="border-l-4 border-primary-500 bg-primary-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white">
                    <span className="text-xs font-bold">优</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      设计系统统一
                    </h3>
                    <span className="text-xs text-gray-500">2025-11-29</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Tailwind + Ant Design
                    颜色配置统一，主色调升级为靛蓝色系，侧边栏优化为浅色主题，整体视觉体验提升
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-orange-500 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
                    <span className="text-xs font-bold">新</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      价格导入与显示功能
                    </h3>
                    <span className="text-xs text-gray-500">2025-11-21</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    支持从飞书表格导入达人价格数据（多年月、多类型），Performance
                    页面新增价格类型切换器，动态表头跟随选择器变化
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                    <span className="text-xs font-bold">优</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      数据导入优化
                    </h3>
                    <span className="text-xs text-gray-500">2025-11-21</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    导入功能迁移至配置页面，新增导入结果可视化面板，支持失败记录详情和导出功能
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-primary-500 bg-primary-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white">
                    <span className="text-xs font-bold">✓</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      侧边栏折叠功能
                    </h3>
                    <span className="text-xs text-gray-500">2025-11-14</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    新增侧边栏折叠按钮，优化页面空间利用，提升用户体验
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-purple-500 bg-purple-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white">
                    <span className="text-xs font-bold">✓</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      多平台达人统一管理
                    </h3>
                    <span className="text-xs text-gray-500">2025-11-11</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    支持抖音、小红书、B站、快手等多平台，oneId跨平台关联功能上线
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
