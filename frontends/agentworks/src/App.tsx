/**
 * AgentWorks - 主应用组件
 * Phase 8: 路由懒加载优化
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home/Home';
import antTheme from './config/antTheme';
import { ThemeProvider } from './contexts/ThemeContext';

// 懒加载大型页面组件（使用 named export）
const TalentsHome = lazy(() =>
  import('./pages/Talents/TalentsHome').then(m => ({ default: m.TalentsHome }))
);
const BasicInfo = lazy(() =>
  import('./pages/Talents/BasicInfo/BasicInfo').then(m => ({
    default: m.BasicInfo,
  }))
);
const CreateTalent = lazy(() =>
  import('./pages/Talents/CreateTalent/CreateTalent').then(m => ({
    default: m.CreateTalent,
  }))
);
const AgenciesList = lazy(() =>
  import('./pages/Talents/Agencies/AgenciesList').then(m => ({
    default: m.AgenciesList,
  }))
);
const RebateComparison = lazy(() =>
  import('./pages/Talents/RebateComparison/RebateComparison').then(m => ({
    default: m.RebateComparison,
  }))
);
const TalentDetail = lazy(() =>
  import('./pages/TalentDetail/TalentDetail').then(m => ({
    default: m.TalentDetail,
  }))
);
const ClientsHome = lazy(() =>
  import('./pages/Clients/ClientsHome').then(m => ({ default: m.ClientsHome }))
);
const ProjectsHome = lazy(() =>
  import('./pages/Projects/ProjectsHome').then(m => ({
    default: m.ProjectsHome,
  }))
);
const ProjectList = lazy(() =>
  import('./pages/Projects/ProjectList').then(m => ({
    default: m.ProjectList,
  }))
);
const ProjectDetail = lazy(() =>
  import('./pages/Projects/ProjectDetail').then(m => ({
    default: m.ProjectDetail,
  }))
);
const ExecutionBoard = lazy(() =>
  import('./pages/ExecutionBoard').then(m => ({
    default: m.ExecutionBoard,
  }))
);
const AnalyticsHome = lazy(() =>
  import('./pages/Analytics/AnalyticsHome').then(m => ({
    default: m.AnalyticsHome,
  }))
);
const TalentPanorama = lazy(() =>
  import('./pages/Analytics/TalentPanorama').then(m => ({
    default: m.TalentPanorama,
  }))
);
const SettingsHome = lazy(() =>
  import('./pages/Settings/SettingsHome').then(m => ({
    default: m.SettingsHome,
  }))
);
const PerformanceHome = lazy(() =>
  import('./pages/Performance/PerformanceHome').then(m => ({
    default: m.PerformanceHome,
  }))
);
const PerformanceAnalytics = lazy(() =>
  import('./pages/Performance/PerformanceAnalytics').then(m => ({
    default: m.PerformanceAnalytics,
  }))
);
const PerformanceConfig = lazy(() =>
  import('./pages/Settings/PerformanceConfig').then(m => ({
    default: m.PerformanceConfig,
  }))
);
const PlatformConfig = lazy(() =>
  import('./pages/Settings/PlatformConfig').then(m => ({
    default: m.PlatformConfig,
  }))
);
const TagManagement = lazy(() =>
  import('./pages/Settings/TagManagement').then(m => ({
    default: m.TagManagement,
  }))
);
const CompanyRebateImportConfig = lazy(() =>
  import('./pages/Settings/CompanyRebateImportConfig').then(m => ({
    default: m.CompanyRebateImportConfig,
  }))
);
const MigrationHome = lazy(() =>
  import('./pages/Migration/MigrationHome').then(m => ({
    default: m.MigrationHome,
  }))
);
// 自动化模块
const AutomationHome = lazy(() =>
  import('./pages/Automation/AutomationHome').then(m => ({
    default: m.AutomationHome,
  }))
);
const AutomationDashboard = lazy(() =>
  import('./pages/Automation/AutomationDashboard').then(m => ({
    default: m.AutomationDashboard,
  }))
);
const WorkflowList = lazy(() =>
  import('./pages/Automation/Workflows/WorkflowList').then(m => ({
    default: m.WorkflowList,
  }))
);
const WorkflowEditor = lazy(() =>
  import('./pages/Automation/Workflows/WorkflowEditor').then(m => ({
    default: m.WorkflowEditor,
  }))
);
const CustomersHome = lazy(() =>
  import('./pages/Customers/CustomersHome').then(m => ({
    default: m.CustomersHome,
  }))
);
const CustomerList = lazy(
  () => import('./pages/Customers/CustomerList/CustomerList')
);
const CustomerForm = lazy(() => import('./pages/Customers/CustomerForm'));
const PricingStrategy = lazy(
  () => import('./pages/Customers/PricingStrategy/PricingStrategy')
);
const CustomerDetail = lazy(() =>
  import('./pages/Customers/CustomerDetail/CustomerDetail').then(m => ({
    default: m.CustomerDetail,
  }))
);
const TalentPoolPage = lazy(() =>
  import('./pages/Customers/TalentPoolPage/TalentPoolPage').then(m => ({
    default: m.TalentPoolPage,
  }))
);
const ProjectConfigPage = lazy(() =>
  import('./pages/Customers/ProjectConfig/ProjectConfigPage').then(m => ({
    default: m.ProjectConfigPage,
  }))
);

/**
 * 加载中组件
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-content-secondary">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 主题感知的 ConfigProvider 包装器
 *
 * 深色模式现在通过 CSS Variables 自动处理
 * 无需切换 Ant Design 主题配置
 */
function ThemedApp() {
  return (
    <ConfigProvider theme={antTheme} locale={zhCN}>
      <AntApp>
        <ErrorBoundary>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />

                  {/* 达人管理模块 */}
                  <Route path="talents" element={<TalentsHome />} />
                  <Route path="talents/basic" element={<BasicInfo />} />
                  <Route path="talents/create" element={<CreateTalent />} />
                  <Route path="talents/agencies" element={<AgenciesList />} />
                  <Route
                    path="talents/rebate-comparison"
                    element={<RebateComparison />}
                  />
                  <Route
                    path="talents/:oneId/:platform"
                    element={<TalentDetail />}
                  />

                  {/* 客户管理模块 */}
                  <Route path="customers" element={<CustomersHome />} />
                  <Route path="customers/list" element={<CustomerList />} />
                  <Route path="customers/new" element={<CustomerForm />} />
                  <Route path="customers/edit/:id" element={<CustomerForm />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route
                    path="customers/:id/talent-pool"
                    element={<TalentPoolPage />}
                  />
                  <Route
                    path="customers/:id/business-strategies"
                    element={<PricingStrategy />}
                  />
                  <Route
                    path="customers/:id/project-config"
                    element={<ProjectConfigPage />}
                  />
                  {/* 兼容旧路由，重定向到新路径 */}
                  <Route
                    path="customers/:id/pricing"
                    element={<Navigate to="../business-strategies" replace />}
                  />

                  {/* 其他模块 */}
                  <Route path="clients" element={<ClientsHome />} />

                  {/* 项目管理模块 */}
                  <Route path="projects" element={<ProjectsHome />} />
                  <Route path="projects/list" element={<ProjectList />} />
                  <Route path="projects/:id" element={<ProjectDetail />} />
                  <Route path="execution-board" element={<ExecutionBoard />} />
                  <Route path="analytics" element={<AnalyticsHome />} />
                  <Route
                    path="analytics/talent-panorama"
                    element={<TalentPanorama />}
                  />
                  <Route
                    path="analytics/talent-trends"
                    element={<PerformanceAnalytics />}
                  />

                  {/* 达人表现模块 */}
                  <Route
                    path="performance/list"
                    element={<PerformanceHome />}
                  />
                  {/* 兼容旧路由，重定向到新路径 */}
                  <Route
                    path="performance/analytics"
                    element={<Navigate to="/analytics/talent-trends" replace />}
                  />
                  <Route
                    path="performance"
                    element={<Navigate to="/performance/list" replace />}
                  />

                  {/* 设置模块 */}
                  <Route path="settings" element={<SettingsHome />} />
                  <Route
                    path="settings/performance-config"
                    element={<PerformanceConfig />}
                  />
                  <Route
                    path="settings/platform-config"
                    element={<PlatformConfig />}
                  />
                  <Route
                    path="settings/tag-management"
                    element={<TagManagement />}
                  />
                  <Route
                    path="settings/company-rebate-import"
                    element={<CompanyRebateImportConfig />}
                  />
                  <Route
                    path="settings/data-migration"
                    element={<MigrationHome />}
                  />

                  {/* 自动化管理模块 */}
                  <Route path="automation" element={<AutomationHome />} />
                  <Route
                    path="automation/dashboard"
                    element={<AutomationDashboard />}
                  />
                  <Route
                    path="automation/workflows"
                    element={<WorkflowList />}
                  />
                  <Route
                    path="automation/workflows/new"
                    element={<WorkflowEditor />}
                  />
                  <Route
                    path="automation/workflows/:id/edit"
                    element={<WorkflowEditor />}
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </AntApp>
    </ConfigProvider>
  );
}

/**
 * 根应用组件（包含 ThemeProvider）
 */
function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
