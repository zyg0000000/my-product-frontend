/**
 * AutomationDashboard 页面
 * 自动化管理仪表板 - ECS 爬虫服务控制中心
 *
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { Card } from 'antd';
import { CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  CpuChipIcon,
  BoltIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';
import { PageHeader } from '../../components/PageHeader';
import {
  ServerStatus,
  SessionManager,
  WorkflowExecutor,
} from '../../components/automation';
import type { TaskExecuteResponse } from '../../api/automation';

/** 快速统计卡片 */
function QuickStatsCard({
  serverConnected,
  cookieValid,
}: {
  serverConnected: boolean;
  cookieValid: boolean;
}) {
  // 这里可以从 localStorage 或 API 获取历史执行数据
  const [stats] = useState({
    todayExecutions: 0,
    successRate: 0,
    avgDuration: 0,
  });

  return (
    <Card
      className="h-full shadow-card hover:shadow-card-hover transition-shadow duration-200"
      bodyStyle={{ padding: 0 }}
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-stroke flex items-center gap-2">
        <ChartBarIcon className="w-5 h-5 text-primary-600" />
        <span className="font-medium text-content">快速统计</span>
      </div>

      {/* 内容区 */}
      <div className="p-4 space-y-4">
        {/* 系统状态 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-content-secondary">系统状态</span>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                serverConnected && cookieValid
                  ? 'bg-success-100 text-success-700'
                  : serverConnected
                    ? 'bg-warning-100 text-warning-700'
                    : 'bg-danger-100 text-danger-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  serverConnected && cookieValid
                    ? 'bg-success-500'
                    : serverConnected
                      ? 'bg-warning-500'
                      : 'bg-danger-500'
                }`}
              />
              {serverConnected && cookieValid
                ? '正常运行'
                : serverConnected
                  ? '需要登录'
                  : '服务离线'}
            </span>
          </div>
        </div>

        {/* 今日执行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <BoltIcon className="w-4 h-4" />
            <span>今日执行</span>
          </div>
          <span className="text-sm font-semibold text-content">
            {stats.todayExecutions} 次
          </span>
        </div>

        {/* 成功率 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <CheckCircleOutlined className="text-base" />
            <span>成功率</span>
          </div>
          <span
            className={`text-sm font-semibold ${
              stats.successRate >= 90
                ? 'text-success-600'
                : stats.successRate >= 70
                  ? 'text-warning-600'
                  : 'text-danger-500'
            }`}
          >
            {stats.successRate}%
          </span>
        </div>

        {/* 平均耗时 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-content-secondary">
            <ClockIcon className="w-4 h-4" />
            <span>平均耗时</span>
          </div>
          <span className="text-sm font-semibold text-content">
            {stats.avgDuration > 0 ? `${stats.avgDuration}秒` : '-'}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function AutomationDashboard() {
  // 服务器和 Cookie 状态
  const [serverConnected, setServerConnected] = useState(false);
  const [cookieValid, setCookieValid] = useState(false);

  // 执行完成回调
  const handleExecutionComplete = useCallback((result: TaskExecuteResponse) => {
    console.log('Execution completed:', result);
    // 这里可以更新统计数据、保存历史记录等
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <PageHeader title="自动化管理" description="ECS 爬虫服务控制中心" />

        {/* 状态卡片行 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 服务器状态 */}
          <ServerStatus
            refreshInterval={30000}
            onStatusChange={setServerConnected}
          />

          {/* 会话状态 */}
          <SessionManager
            refreshInterval={60000}
            onStatusChange={setCookieValid}
          />

          {/* 快速统计 */}
          <QuickStatsCard
            serverConnected={serverConnected}
            cookieValid={cookieValid}
          />
        </div>

        {/* 工作流执行器 */}
        <WorkflowExecutor
          disabled={!serverConnected}
          onExecutionComplete={handleExecutionComplete}
        />

        {/* 功能提示 */}
        {!serverConnected && (
          <div className="p-4 rounded-lg bg-warning-50 border border-warning-200">
            <div className="flex items-start gap-3">
              <CpuChipIcon className="w-5 h-5 text-warning-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-warning-800 mb-1">
                  服务器未连接
                </h4>
                <p className="text-sm text-warning-700">
                  无法连接到 ECS 爬虫服务器，请检查网络连接或联系管理员。
                  服务器地址: 14.103.18.8:3001
                </p>
              </div>
            </div>
          </div>
        )}

        {serverConnected && !cookieValid && (
          <div className="p-4 rounded-lg bg-info-50 border border-info-200">
            <div className="flex items-start gap-3">
              <ThunderboltOutlined className="text-lg text-info-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-info-800 mb-1">
                  登录凭证已过期
                </h4>
                <p className="text-sm text-info-700">
                  抖音登录凭证已过期，部分工作流可能无法正常执行。
                  请在本地运行登录脚本刷新 Cookie。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default AutomationDashboard;
