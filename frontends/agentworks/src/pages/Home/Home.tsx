/**
 * 首页
 * 使用新设计系统
 */

import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { PageTransition } from '../../components/PageTransition';

export function Home() {
  const navigate = useNavigate();

  const quickActions = [
    {
      name: '达人管理',
      description: '查看和管理多平台达人信息',
      icon: UsersIcon,
      path: '/talents',
      gradient: 'from-primary-500 to-primary-600',
      shadowColor: 'shadow-primary',
    },
    {
      name: '客户管理',
      description: '管理客户信息和合作关系',
      icon: BuildingOfficeIcon,
      path: '/customers',
      gradient: 'from-warning-500 to-warning-600',
      shadowColor: 'shadow-[0_2px_8px_rgba(245,158,11,0.25)]',
    },
    {
      name: '项目管理',
      description: '管理广告投放项目',
      icon: FolderIcon,
      path: '/projects',
      gradient: 'from-success-500 to-success-600',
      shadowColor: 'shadow-success',
    },
    {
      name: '数据分析',
      description: '查看项目和达人数据分析',
      icon: ChartBarIcon,
      path: '/analytics',
      gradient: 'from-info-500 to-info-600',
      shadowColor: 'shadow-[0_2px_8px_rgba(14,165,233,0.25)]',
    },
  ];

  const updates = [
    {
      type: 'optimize',
      icon: BoltIcon,
      title: '代码质量优化',
      date: '2025-11-30',
      description:
        '类型安全增强、API 层重试机制、组件架构拆分、可访问性改进（WCAG AA）、console 日志清理',
      color: 'primary',
    },
    {
      type: 'new',
      icon: SparklesIcon,
      title: '设计系统统一',
      date: '2025-11-29',
      description:
        'Tailwind + Ant Design 颜色配置统一，主色调升级为靛蓝色系，侧边栏优化为浅色主题，整体视觉体验提升',
      color: 'success',
    },
    {
      type: 'feature',
      icon: ArrowTrendingUpIcon,
      title: '价格导入与显示功能',
      date: '2025-11-21',
      description:
        '支持从飞书表格导入达人价格数据（多年月、多类型），Performance 页面新增价格类型切换器',
      color: 'warning',
    },
    {
      type: 'done',
      icon: CheckCircleIcon,
      title: '侧边栏折叠功能',
      date: '2025-11-14',
      description: '新增侧边栏折叠按钮，优化页面空间利用，提升用户体验',
      color: 'info',
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<
      string,
      { bg: string; border: string; icon: string; text: string }
    > = {
      primary: {
        bg: 'bg-primary-50',
        border: 'border-l-primary-500',
        icon: 'bg-primary-500 text-white',
        text: 'text-primary-600',
      },
      success: {
        bg: 'bg-success-50',
        border: 'border-l-success-500',
        icon: 'bg-success-500 text-white',
        text: 'text-success-600',
      },
      warning: {
        bg: 'bg-warning-50',
        border: 'border-l-warning-500',
        icon: 'bg-warning-500 text-white',
        text: 'text-warning-600',
      },
      info: {
        bg: 'bg-info-50',
        border: 'border-l-info-500',
        icon: 'bg-info-500 text-white',
        text: 'text-info-600',
      },
    };
    return colorMap[color] || colorMap.primary;
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* 欢迎信息 - 更精致的设计 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-white">
          {/* 装饰背景 */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  欢迎使用 AgentWorks
                </h1>
                <p className="mt-1 text-primary-100">
                  多平台达人营销管理系统
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-success-400 animate-pulse" />
                系统运行正常
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
                v3.9.0
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 - 卡片悬停效果增强 */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-gray-900">
              快速操作
            </h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group relative flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:border-gray-300 hover:shadow-lg"
              >
                {/* 悬停时的渐变背景 */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                <div className="relative">
                  <div
                    className={`rounded-xl bg-gradient-to-br ${action.gradient} p-3 ${action.shadowColor} transition-transform duration-200 group-hover:scale-105`}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-primary-600">
                    {action.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {action.description}
                  </p>

                  {/* 箭头指示 */}
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <span>进入</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 近期功能更新 - 更现代的时间线设计 */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="font-display text-xl font-semibold text-gray-900">
              近期更新
            </h2>
            <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600">
              v3.9.0
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {updates.map((update, index) => {
              const colors = getColorClasses(update.color);
              return (
                <div
                  key={index}
                  className={`relative rounded-lg border-l-4 ${colors.border} ${colors.bg} p-4 transition-all duration-200 hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${colors.icon}`}
                    >
                      <update.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {update.title}
                        </h3>
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {update.date}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                        {update.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 查看更多 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              <span>查看完整更新日志</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
