/**
 * AgentWorks - 主应用组件
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home/Home';
import { TalentsHome } from './pages/Talents/TalentsHome';
import { BasicInfo } from './pages/Talents/BasicInfo/BasicInfo';
import { TalentDetail } from './pages/TalentDetail/TalentDetail';
import { ClientsHome } from './pages/Clients/ClientsHome';
import { ProjectsHome } from './pages/Projects/ProjectsHome';
import { AnalyticsHome } from './pages/Analytics/AnalyticsHome';
import { SettingsHome } from './pages/Settings/SettingsHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />

          {/* 达人管理模块 */}
          <Route path="talents" element={<TalentsHome />} />
          <Route path="talents/basic" element={<BasicInfo />} />
          <Route path="talents/:oneId/:platform" element={<TalentDetail />} />

          {/* 其他模块 */}
          <Route path="clients" element={<ClientsHome />} />
          <Route path="projects" element={<ProjectsHome />} />
          <Route path="analytics" element={<AnalyticsHome />} />
          <Route path="settings" element={<SettingsHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
