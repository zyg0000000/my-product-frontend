/**
 * 项目管理模块首页
 */

import { FolderIcon } from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';
import { motion } from 'framer-motion';

export function ProjectsHome() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
          <p className="mt-2 text-lg text-gray-600">
            管理广告投放项目，跟踪项目执行和效果
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
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <FolderIcon className="mx-auto h-16 w-16 text-gray-400" />
            </motion.div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              功能开发中
            </h3>
            <p className="mt-2 text-gray-600">
              项目管理模块正在开发中，敬请期待
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
