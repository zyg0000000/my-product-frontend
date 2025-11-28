/**
 * 主布局组件
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1500px] px-6 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
