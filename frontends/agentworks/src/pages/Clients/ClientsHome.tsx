/**
 * 客户管理模块首页
 */

import {
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export function ClientsHome() {

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
        <p className="mt-2 text-lg text-gray-600">
          管理客户信息和合作关系，维护客户档案
        </p>
      </div>

      {/* 开发中提示 */}
      <div className="card">
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            功能开发中
          </h3>
          <p className="mt-2 text-gray-600">
            客户管理模块正在开发中，敬请期待
          </p>
        </div>
      </div>

      {/* 规划中的功能 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          规划中的功能
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <UserGroupIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">客户档案管理</h4>
              <p className="text-sm text-gray-600 mt-1">
                记录客户基本信息、联系方式、合作历史
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">合作项目跟踪</h4>
              <p className="text-sm text-gray-600 mt-1">
                查看客户的所有合作项目和执行状态
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <BuildingOfficeIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">客户分析报表</h4>
              <p className="text-sm text-gray-600 mt-1">
                统计客户投放数据和ROI分析
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
