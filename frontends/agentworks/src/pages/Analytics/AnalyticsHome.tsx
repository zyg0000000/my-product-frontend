/**
 * 数据分析模块首页
 */

import { ChartBarIcon } from '@heroicons/react/24/outline';

export function AnalyticsHome() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">数据分析</h1>
        <p className="mt-2 text-lg text-gray-600">
          查看项目和达人数据分析，生成各类统计报表
        </p>
      </div>

      {/* 开发中提示 */}
      <div className="card">
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            功能开发中
          </h3>
          <p className="mt-2 text-gray-600">
            数据分析模块正在开发中，敬请期待
          </p>
        </div>
      </div>
    </div>
  );
}
