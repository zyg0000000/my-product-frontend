/**
 * 项目看板页面
 * @module pages/Projects/Dashboard/ProjectDashboard
 */

import { useState } from 'react';
import { Button, Tabs, App, Badge } from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  FundProjectionScreenOutlined,
  AppstoreOutlined,
  UserOutlined,
  CheckCircleOutlined,
  TableOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageTransition } from '../../../components/PageTransition';
import { useDashboardData } from './hooks/useDashboardData';
import { FilterPanel } from './components/FilterPanel';
import { SummaryCards } from './components/SummaryCards';
import { GroupStatsTable } from './components/GroupStatsTable';
import { ProjectTable } from './components/ProjectTable';
import { exportDashboardToExcel } from '../../../utils/dashboardExport';

type TabKey = 'platform' | 'status' | 'customer';

export function ProjectDashboard() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('platform');
  const [exporting, setExporting] = useState(false);

  const {
    loading,
    hasSearched,
    filters,
    setFilters,
    summaryStats,
    platformStats,
    statusStats,
    customerStats,
    projectList,
    pagination,
    setPagination,
    refresh,
    excludedIds,
    setExcluded,
  } = useDashboardData();

  // 导出 Excel
  const handleExport = async () => {
    if (!summaryStats) {
      message.warning('暂无数据可导出');
      return;
    }

    setExporting(true);
    try {
      exportDashboardToExcel({
        summary: summaryStats,
        platformStats,
        statusStats,
        customerStats,
        projects: projectList,
        filters,
        exportedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  // 重置筛选条件
  const handleReset = () => {
    setFilters({
      startYear: undefined,
      startMonth: undefined,
      endYear: undefined,
      endMonth: undefined,
      useFinancialPeriod: false,
      customerIds: undefined,
      statuses: undefined,
      platforms: undefined,
      businessTypes: undefined,
    });
  };

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FundProjectionScreenOutlined className="text-xl text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-content">项目看板</h1>
              <p className="text-sm text-content-secondary">
                汇总统计信息，支持多维度筛选和导出
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<ReloadOutlined />}
              onClick={refresh}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
              disabled={!summaryStats}
              className="shadow-sm"
            >
              导出 Excel
            </Button>
          </div>
        </div>

        {/* 筛选面板 */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={handleReset}
          onSearch={refresh}
          loading={loading}
        />

        {/* 顶部汇总卡片 */}
        <SummaryCards
          stats={summaryStats}
          loading={loading}
          hasSearched={hasSearched}
        />

        {/* 分组统计 */}
        <div className="rounded-xl border border-stroke bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke bg-surface-subtle/50">
            <h2 className="text-base font-semibold text-content flex items-center gap-2">
              <AppstoreOutlined className="text-content-muted" />
              分组统计
            </h2>
          </div>
          <Tabs
            activeKey={activeTab}
            onChange={key => setActiveTab(key as TabKey)}
            className="px-4"
            items={[
              {
                key: 'platform',
                label: (
                  <span className="flex items-center gap-1.5">
                    <AppstoreOutlined />
                    按平台
                    {platformStats.length > 0 && (
                      <Badge
                        count={platformStats.length}
                        size="small"
                        className="ml-1"
                        style={{ backgroundColor: 'var(--aw-primary-500)' }}
                      />
                    )}
                  </span>
                ),
                children: (
                  <div className="pb-4">
                    <GroupStatsTable
                      type="platform"
                      data={platformStats}
                      loading={loading}
                    />
                  </div>
                ),
              },
              {
                key: 'status',
                label: (
                  <span className="flex items-center gap-1.5">
                    <CheckCircleOutlined />
                    按状态
                    {statusStats.length > 0 && (
                      <Badge
                        count={statusStats.length}
                        size="small"
                        className="ml-1"
                        style={{ backgroundColor: 'var(--aw-success-500)' }}
                      />
                    )}
                  </span>
                ),
                children: (
                  <div className="pb-4">
                    <GroupStatsTable
                      type="status"
                      data={statusStats}
                      loading={loading}
                    />
                  </div>
                ),
              },
              {
                key: 'customer',
                label: (
                  <span className="flex items-center gap-1.5">
                    <UserOutlined />
                    按客户
                    {customerStats.length > 0 && (
                      <Badge
                        count={customerStats.length}
                        size="small"
                        className="ml-1"
                        style={{ backgroundColor: 'var(--aw-warning-500)' }}
                      />
                    )}
                  </span>
                ),
                children: (
                  <div className="pb-4">
                    <GroupStatsTable
                      type="customer"
                      data={customerStats}
                      loading={loading}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>

        {/* 项目列表 */}
        <div className="rounded-xl border border-stroke bg-surface shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke bg-surface-subtle/50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-content flex items-center gap-2">
              <TableOutlined className="text-content-muted" />
              项目明细
              {projectList.length > 0 && (
                <span className="text-sm font-normal text-content-secondary ml-2">
                  共 {pagination.total} 个项目
                </span>
              )}
            </h2>
          </div>
          <div className="p-4">
            <ProjectTable
              data={projectList}
              loading={loading}
              pagination={pagination}
              onPaginationChange={setPagination}
              excludedIds={excludedIds}
              onExcludeChange={setExcluded}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

export default ProjectDashboard;
