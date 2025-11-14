/**
 * 首页
 */

import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

export function Home() {
  const navigate = useNavigate();

  const quickActions = [
    {
      name: '达人管理',
      description: '查看和管理多平台达人信息',
      icon: UsersIcon,
      path: '/talents',
      color: 'bg-blue-500',
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
    <div className="space-y-8">
      {/* 欢迎信息 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">欢迎使用 AgentWorks</h1>
        <p className="mt-2 text-lg text-gray-600">多平台广告代理项目管理系统</p>
      </div>

      {/* 快速操作 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="group relative flex flex-col items-start rounded-lg border-2 border-gray-200 bg-white p-6 text-left transition-all hover:border-primary-500 hover:shadow-lg"
            >
              <div className={`rounded-lg ${action.color} p-3`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{action.name}</h3>
              <p className="mt-2 text-sm text-gray-500">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 系统信息 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">系统信息</h2>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">版本</span>
            <span className="font-medium text-gray-900">v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">数据库</span>
            <span className="font-medium text-gray-900">agentworks_db (v2)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">支持平台</span>
            <span className="font-medium text-gray-900">抖音、小红书、B站、快手</span>
          </div>
        </div>
      </div>

      {/* 功能特性 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">核心特性</h2>
        <ul className="mt-4 space-y-3">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
              ✓
            </span>
            <div>
              <p className="font-medium text-gray-900">多平台统一管理</p>
              <p className="text-sm text-gray-500">支持抖音、小红书、B站等多个平台</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
              ✓
            </span>
            <div>
              <p className="font-medium text-gray-900">价格和返点历史追溯</p>
              <p className="text-sm text-gray-500">支持按月记录价格和返点变化历史</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
              ✓
            </span>
            <div>
              <p className="font-medium text-gray-900">oneId 跨平台关联</p>
              <p className="text-sm text-gray-500">同一达人在不同平台自动关联</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
