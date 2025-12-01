/**
 * 客户管理模块首页
 */

import { useNavigate } from 'react-router-dom';
import {
  TeamOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { PageTransition } from '../../components/PageTransition';
import { motion } from 'framer-motion';

export function CustomersHome() {
  const navigate = useNavigate();

  const modules = [
    {
      name: '客户列表',
      description: '管理客户基础信息、联系人和业务配置',
      icon: TeamOutlined,
      path: '/customers/list',
      color: 'bg-primary-500',
      available: true,
    },
    {
      name: '价格策略',
      description: '配置客户价格策略和报价系数',
      icon: CalculatorOutlined,
      path: '/customers/pricing',
      color: 'bg-green-500',
      available: false,
    },
    {
      name: '合作记录',
      description: '查看客户合作历史和项目记录',
      icon: FileTextOutlined,
      path: '/customers/history',
      color: 'bg-purple-500',
      available: false,
    },
    {
      name: '数据分析',
      description: '客户价值分析和业绩统计',
      icon: BarChartOutlined,
      path: '/customers/analytics',
      color: 'bg-orange-500',
      available: false,
    },
  ];

  return (
    <PageTransition>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200"
            >
              <p className="text-3xl font-bold text-primary-900">0</p>
              <p className="text-sm text-primary-700 mt-1 font-medium">
                总客户数
              </p>
            </motion.div>
            {[
              { label: 'VIP客户', value: 0, delay: 0.1 },
              { label: '大型客户', value: 0, delay: 0.2 },
              { label: '活跃客户', value: 0, delay: 0.3 },
            ].map(item => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.delay, duration: 0.3 }}
                whileHover={{
                  y: -4,
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 transition-shadow"
              >
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-sm text-gray-600 mt-1">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 功能模块 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">功能模块</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <motion.button
                key={module.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                whileHover={module.available ? { scale: 1.02, y: -4 } : {}}
                whileTap={module.available ? { scale: 0.98 } : {}}
                onClick={() => module.available && navigate(module.path)}
                disabled={!module.available}
                className={`group relative flex flex-col items-start rounded-lg border-2 bg-white p-6 text-left transition-colors ${
                  module.available
                    ? 'border-gray-200 hover:border-primary-500 hover:shadow-lg cursor-pointer'
                    : 'border-gray-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`rounded-lg ${module.color} p-3 flex items-center justify-center`}
                >
                  <module.icon style={{ fontSize: '24px', color: 'white' }} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {module.name}
                  {!module.available && (
                    <span className="ml-2 text-xs text-gray-400">(开发中)</span>
                  )}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {module.description}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 快速操作 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/customers/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <PlusCircleOutlined style={{ fontSize: '20px' }} />
              新增客户
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
