/**
 * 自动化模块首页
 *
 * 版本: v1.0.0
 * 更新时间: 2025-12-23
 *
 * 功能说明：
 * - 展示自动化模块的功能入口
 * - 卡片式导航设计
 * - 支持深色模式
 */

import { useNavigate } from 'react-router-dom';
import { ProCard } from '@ant-design/pro-components';
import { RightOutlined } from '@ant-design/icons';
import {
  CpuChipIcon,
  BoltIcon,
  Cog6ToothIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';

interface FeatureItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  status: 'active' | 'beta' | 'coming';
}

export function AutomationHome() {
  const navigate = useNavigate();

  const featureItems: FeatureItem[] = [
    {
      key: 'dashboard',
      title: '控制台',
      description:
        'ECS 爬虫服务控制中心，监控服务器状态、管理登录会话、执行自动化任务',
      icon: (
        <CpuChipIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      ),
      path: '/automation/dashboard',
      status: 'active',
    },
    {
      key: 'workflows',
      title: '工作流管理',
      description:
        '管理自动化工作流，创建、编辑、删除工作流定义，支持多平台配置',
      icon: (
        <Cog6ToothIcon className="w-6 h-6 text-success-600 dark:text-success-400" />
      ),
      path: '/automation/workflows',
      status: 'active',
    },
  ];

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 rounded">
            稳定
          </span>
        );
      case 'beta':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
            Beta
          </span>
        );
      case 'coming':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-surface-sunken text-content-secondary rounded">
            即将上线
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-content">自动化</h1>
          <p className="mt-1 text-sm text-content-secondary">
            管理自动化工作流，执行数据采集和处理任务
          </p>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureItems.map(item => (
            <ProCard
              key={item.key}
              hoverable
              className="cursor-pointer"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface-base dark:bg-surface-sunken rounded-lg">
                  {item.icon}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-content">
                      {item.title}
                    </h3>
                    {getStatusTag(item.status)}
                  </div>
                  <p className="text-sm text-content-secondary line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* 箭头 */}
                <div className="flex-shrink-0">
                  <RightOutlined className="text-content-muted" />
                </div>
              </div>
            </ProCard>
          ))}
        </div>

        {/* 快捷操作区 */}
        <ProCard
          title={
            <div className="flex items-center gap-2">
              <PlayCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span>快捷操作</span>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/automation/dashboard')}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-base dark:bg-surface-sunken hover:bg-surface-subtle dark:hover:bg-surface-base transition-colors text-left"
            >
              <CpuChipIcon className="w-5 h-5 text-content-muted" />
              <div>
                <div className="text-sm font-medium text-content">
                  查看服务器状态
                </div>
                <div className="text-xs text-content-muted">
                  监控 ECS 运行状况
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/automation/workflows')}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-base dark:bg-surface-sunken hover:bg-surface-subtle dark:hover:bg-surface-base transition-colors text-left"
            >
              <Cog6ToothIcon className="w-5 h-5 text-content-muted" />
              <div>
                <div className="text-sm font-medium text-content">
                  管理工作流
                </div>
                <div className="text-xs text-content-muted">
                  查看和编辑工作流
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/automation/workflows/new')}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-base dark:bg-surface-sunken hover:bg-surface-subtle dark:hover:bg-surface-base transition-colors text-left"
            >
              <BoltIcon className="w-5 h-5 text-content-muted" />
              <div>
                <div className="text-sm font-medium text-content">
                  创建工作流
                </div>
                <div className="text-xs text-content-muted">新建自动化任务</div>
              </div>
            </button>
          </div>
        </ProCard>

        {/* 提示信息 */}
        <ProCard className="alert-info">
          <div className="flex items-start gap-3">
            <BoltIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
            <div>
              <h4 className="alert-info-title mb-1">关于自动化模块</h4>
              <p className="alert-info-text">
                自动化模块用于管理和执行数据采集任务。工作流定义了具体的操作步骤，
                通过 ECS
                服务器执行浏览器自动化操作。请确保服务器在线且登录凭证有效后再执行任务。
              </p>
            </div>
          </div>
        </ProCard>
      </div>
    </PageTransition>
  );
}

export default AutomationHome;
