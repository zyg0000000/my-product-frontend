/**
 * 执行看板 - 主页面
 * 跨项目发布计划管理系统
 */

import { useState, useCallback, useMemo } from 'react';
import { Spin, Empty } from 'antd';
import { PageHeader } from '../../components/PageHeader';
import { FilterBar } from './components/FilterBar';
import { KPIPanel } from './components/KPIPanel';
import { WeekOverview } from './components/WeekOverview';
import { CalendarView } from './components/CalendarView';
import { EditModal } from './components/EditModal';
import { ViewModal } from './components/ViewModal';
import { useExecutionData } from './hooks/useExecutionData';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import type {
  ExecutionFilters,
  CollaborationWithProject,
  UpdateCollaborationRequest,
} from './types';
import { calculateExecutionStats } from './utils';

// 获取当前年月
const getCurrentYearMonth = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

// 默认筛选条件
const DEFAULT_FILTERS: ExecutionFilters = {
  customerId: null,
  projectIds: [],
  platforms: [],
  cycle: {
    type: 'business',
    year: getCurrentYearMonth().year,
    month: getCurrentYearMonth().month,
  },
};

export function ExecutionBoard() {
  // 筛选状态
  const [filters, setFilters] = useState<ExecutionFilters>(DEFAULT_FILTERS);

  // 弹窗状态
  const [editingCollab, setEditingCollab] =
    useState<CollaborationWithProject | null>(null);
  const [viewingCollab, setViewingCollab] =
    useState<CollaborationWithProject | null>(null);

  // 数据加载
  const {
    customers,
    projects,
    collaborations,
    loading,
    refetch,
    updateCollaboration,
  } = useExecutionData(filters);

  // 日历导航
  const {
    currentWeekStart,
    projectCycle,
    weekStats,
    currentWeekIndex,
    navigateWeek,
    jumpToWeek,
    goToToday,
    canGoPrev,
    canGoNext,
  } = useCalendarNavigation(collaborations);

  // 计算 KPI 统计
  const stats = useMemo(() => {
    return calculateExecutionStats(collaborations, currentWeekStart);
  }, [collaborations, currentWeekStart]);

  // 处理筛选变更
  const handleFilterChange = useCallback(
    (newFilters: Partial<ExecutionFilters>) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    []
  );

  // 重置筛选
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // 处理卡片点击
  const handleCardClick = useCallback((collab: CollaborationWithProject) => {
    if (collab.projectStatus === 'executing') {
      setEditingCollab(collab);
    } else {
      setViewingCollab(collab);
    }
  }, []);

  // 处理拖拽改期
  const handleCardDrop = useCallback(
    async (collabId: string, newDate: string) => {
      const collab = collaborations.find(c => c.id === collabId);
      if (!collab) return;

      const updates: UpdateCollaborationRequest = {
        plannedReleaseDate: newDate,
      };

      // 如果已发布，同时更新实际发布日期
      if (collab.status === '视频已发布') {
        updates.actualReleaseDate = newDate;
      }

      await updateCollaboration(collabId, updates);
    },
    [collaborations, updateCollaboration]
  );

  // 处理保存
  const handleSave = useCallback(
    async (id: string, data: UpdateCollaborationRequest): Promise<boolean> => {
      return await updateCollaboration(id, data);
    },
    [updateCollaboration]
  );

  // 判断是否有数据可展示
  const hasData = filters.customerId && filters.projectIds.length > 0;

  return (
    <div className="min-h-screen bg-surface-subtle">
      <PageHeader title="执行看板" description="跨项目发布计划管理" />

      <div className="px-6 py-5 space-y-5">
        {/* 筛选栏 */}
        <FilterBar
          customers={customers}
          projects={projects}
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          loading={loading}
        />

        {/* 主内容区 */}
        {loading ? (
          <div className="flex items-center justify-center py-24 bg-surface rounded-xl border border-stroke shadow-sm">
            <Spin size="large">
              <div className="pt-8 text-content-muted">加载中...</div>
            </Spin>
          </div>
        ) : !hasData ? (
          <div className="bg-surface rounded-xl border border-stroke p-12 shadow-sm">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-content-muted text-sm">
                  请选择客户和项目以查看执行看板
                </span>
              }
            />
          </div>
        ) : collaborations.length === 0 ? (
          <div className="bg-surface rounded-xl border border-stroke p-12 shadow-sm">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-content-muted text-sm">
                  所选项目暂无发布计划
                </span>
              }
            />
          </div>
        ) : (
          <>
            {/* KPI 统计面板 */}
            <KPIPanel
              stats={stats}
              currentWeekStart={currentWeekStart}
              projectCycle={projectCycle}
            />

            {/* 全周期概览 */}
            <WeekOverview
              projectCycle={projectCycle}
              weekStats={weekStats}
              currentWeekIndex={currentWeekIndex}
              onWeekClick={jumpToWeek}
              onGoToToday={goToToday}
              onRefresh={refetch}
              loading={loading}
            />

            {/* 日历周视图 */}
            <CalendarView
              weekStart={currentWeekStart}
              collaborations={collaborations}
              onCardClick={handleCardClick}
              onCardDrop={handleCardDrop}
              onNavigate={navigateWeek}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />
          </>
        )}
      </div>

      {/* 编辑弹窗 */}
      <EditModal
        collaboration={editingCollab}
        open={!!editingCollab}
        onSave={handleSave}
        onCancel={() => setEditingCollab(null)}
      />

      {/* 查看弹窗 */}
      <ViewModal
        collaboration={viewingCollab}
        open={!!viewingCollab}
        onClose={() => setViewingCollab(null)}
      />
    </div>
  );
}
