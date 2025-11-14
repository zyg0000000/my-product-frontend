/**
 * AgentWorks - 主应用组件
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home/Home';
import { TalentList } from './pages/TalentList/TalentList';
import { TalentDetail } from './pages/TalentDetail/TalentDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="talents" element={<TalentList />} />
          <Route path="talents/:oneId/:platform" element={<TalentDetail />} />
          <Route path="projects" element={<div className="card">项目管理（开发中）</div>} />
          <Route path="analytics" element={<div className="card">数据分析（开发中）</div>} />
          <Route path="settings" element={<div className="card">系统设置（开发中）</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
