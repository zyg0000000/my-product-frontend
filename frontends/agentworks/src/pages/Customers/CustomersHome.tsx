/**
 * 客户管理模块首页
 */

import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  DocumentTextIcon,
  CalculatorIcon,
  ChartBarIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

export function CustomersHome() {
  const navigate = useNavigate();

  const modules = [
    {
      name: '客户列表',
      description: '管理客户基础信息、联系人和业务配置',
      icon: UsersIcon,
      path: '/customers/list',
      color: 'bg-blue-500',
      available: true,
    },
    {
      name: '价格策略',
      description: '配置客户价格策略和支付系数',
      icon: CalculatorIcon,
      path: '/customers/pricing',
      color: 'bg-green-500',
      available: false,
    },
    {
      name: '合作记录',
      description: '查看客户合作历史和项目记录',
      icon: DocumentTextIcon,
      path: '/customers/history',
      color: 'bg-purple-500',
      available: false,
    },
    {
      name: '数据分析',
      description: '客户价值分析和业绩统计',
      icon: ChartBarIcon,
      path: '/customers/analytics',
      color: 'bg-orange-500',
      available: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
        <p className="mt-2 text-lg text-gray-600">
          管理客户信息、价格策略和合作记录
        </p>
      </div>

      {/* 快速统计 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <p className="text-3xl font-bold text-blue-900">0</p>
            <p className="text-sm text-blue-700 mt-1 font-medium">总客户数</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600 mt-1">VIP客户</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600 mt-1">大型客户</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600 mt-1">活跃客户</p>
          </div>
        </div>
      </div>

      {/* 功能模块 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">功能模块</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(module => (
            <button
              key={module.path}
              onClick={() => module.available && navigate(module.path)}
              disabled={!module.available}
              className={`group relative flex flex-col items-start rounded-lg border-2 bg-white p-6 text-left transition-all ${
                module.available
                  ? 'border-gray-200 hover:border-primary-500 hover:shadow-lg cursor-pointer'
                  : 'border-gray-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className={`rounded-lg ${module.color} p-3`}>
                <module.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {module.name}
                {!module.available && (
                  <span className="ml-2 text-xs text-gray-400">(开发中)</span>
                )}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{module.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5" />
            新增客户
          </button>
        </div>
      </div>
    </div>
  );
}
