/**
 * AgentWorks - 主应用组件
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home/Home';
import { TalentLayout } from './pages/Talents/TalentLayout';
import { BasicInfo } from './pages/Talents/BasicInfo/BasicInfo';
import { TalentDetail } from './pages/TalentDetail/TalentDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />

          {/* 达人管理模块 - 嵌套路由 */}
          <Route path="talents" element={<TalentLayout />}>
            <Route index element={<Navigate to="/talents/basic" replace />} />
            <Route path="basic" element={<BasicInfo />} />
          </Route>

          {/* 达人详情页 */}
          <Route path="talents/:oneId/:platform" element={<TalentDetail />} />

          {/* 其他模块 */}
          <Route
            path="projects"
            element={<div className="card">项目管理（开发中）</div>}
          />
          <Route
            path="analytics"
            element={<div className="card">数据分析（开发中）</div>}
          />
          <Route
            path="settings"
            element={<div className="card">系统设置（开发中）</div>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
