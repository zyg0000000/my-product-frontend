/**
 * 达人管理模块首页
 */

import { useNavigate } from 'react-router-dom';
import {
  InformationCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

export function TalentsHome() {
  const navigate = useNavigate();

  const modules = [
    {
      name: '基础信息',
      description: '管理达人基础资料、价格和返点信息',
      icon: InformationCircleIcon,
      path: '/talents/basic',
      color: 'bg-blue-500',
      available: true,
    },
    {
      name: '档期管理',
      description: '达人档期安排和时间管理',
      icon: CalendarIcon,
      path: '/talents/schedule',
      color: 'bg-green-500',
      available: false,
    },
    {
      name: '近期表现',
      description: '查看达人数据和效果分析',
      icon: ChartBarIcon,
      path: '/talents/performance',
      color: 'bg-purple-500',
      available: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">达人管理</h1>
        <p className="mt-2 text-lg text-gray-600">
          管理多平台达人信息，查看达人数据和表现
        </p>
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

      {/* 快速统计 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-1">总达人数</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-1">抖音</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-1">小红书</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">-</p>
            <p className="text-sm text-gray-600 mt-1">B站</p>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/talents/basic')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5" />
            新增达人
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            批量导入
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            导出数据
          </button>
        </div>
      </div>
    </div>
  );
}
