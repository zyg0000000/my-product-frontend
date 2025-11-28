/**
 * 客户管理模块首页
 */

import {
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';
import { motion } from 'framer-motion';

export function ClientsHome() {
  const features = [
    {
      icon: UserGroupIcon,
      title: '客户档案管理',
      description: '记录客户基本信息、联系方式、合作历史',
    },
    {
      icon: DocumentTextIcon,
      title: '合作项目跟踪',
      description: '查看客户的所有合作项目和执行状态',
    },
    {
      icon: BuildingOfficeIcon,
      title: '客户分析报表',
      description: '统计客户投放数据和ROI分析',
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
          <p className="mt-2 text-lg text-gray-600">
            管理客户信息和合作关系，维护客户档案
          </p>
        </div>

        {/* 开发中提示 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="card"
        >
          <div className="text-center py-12">
            <BuildingOfficeIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              功能开发中
            </h3>
            <p className="mt-2 text-gray-600">
              客户管理模块正在开发中，敬请期待
            </p>
          </div>
        </motion.div>

        {/* 规划中的功能 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            规划中的功能
          </h2>
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
                whileHover={{ x: 4, backgroundColor: 'rgba(249, 250, 251, 1)' }}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg transition-colors"
              >
                <feature.icon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">{feature.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
