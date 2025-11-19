/**
 * AgentWorks - 主应用组件
 * Phase 8: 路由懒加载优化
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home/Home';

// 懒加载大型页面组件（使用 named export）
const TalentsHome = lazy(() => import('./pages/Talents/TalentsHome').then(m => ({ default: m.TalentsHome })));
const BasicInfo = lazy(() => import('./pages/Talents/BasicInfo/BasicInfo').then(m => ({ default: m.BasicInfo })));
const CreateTalent = lazy(() => import('./pages/Talents/CreateTalent/CreateTalent').then(m => ({ default: m.CreateTalent })));
const AgenciesList = lazy(() => import('./pages/Talents/Agencies/AgenciesList').then(m => ({ default: m.AgenciesList })));
const TalentDetail = lazy(() => import('./pages/TalentDetail/TalentDetail').then(m => ({ default: m.TalentDetail })));
const ClientsHome = lazy(() => import('./pages/Clients/ClientsHome').then(m => ({ default: m.ClientsHome })));
const ProjectsHome = lazy(() => import('./pages/Projects/ProjectsHome').then(m => ({ default: m.ProjectsHome })));
const AnalyticsHome = lazy(() => import('./pages/Analytics/AnalyticsHome').then(m => ({ default: m.AnalyticsHome })));
const SettingsHome = lazy(() => import('./pages/Settings/SettingsHome').then(m => ({ default: m.SettingsHome })));
const PerformanceHome = lazy(() => import('./pages/Performance/PerformanceHome').then(m => ({ default: m.PerformanceHome })));
const PerformanceConfig = lazy(() => import('./pages/Settings/PerformanceConfig').then(m => ({ default: m.PerformanceConfig })));

/**
 * 加载中组件
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    </div>
  );
}

function App() {
  return (
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
              <Route path="talents/:oneId/:platform" element={<TalentDetail />} />

              {/* 其他模块 */}
              <Route path="clients" element={<ClientsHome />} />
              <Route path="projects" element={<ProjectsHome />} />
              <Route path="analytics" element={<AnalyticsHome />} />

              {/* 达人表现模块 */}
              <Route path="performance" element={<PerformanceHome />} />

              {/* 设置模块 */}
              <Route path="settings" element={<SettingsHome />} />
              <Route path="settings/performance-config" element={<PerformanceConfig />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
