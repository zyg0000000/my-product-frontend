/**
 * 单项目日报详情页 (重构版)
 *
 * 功能：
 * - 日报概览（汇总+达人表格）
 * - 达人趋势（CPM 折线图）
 * - 数据抓取（预留）
 */

import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, DatePicker, Button, Space, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CloudDownloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageTransition } from '../../../components/PageTransition';
import { useDailyReportData } from '../../../hooks/useDailyReportData';
import { useExportImage } from '../../../hooks/useExportImage';
import { useTheme } from '../../../contexts/ThemeContext';
import { DailyOverviewTab, TalentTrendTab, DataFetchTab } from './tabs';

export function ProjectDailyReport() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 日报数据
  const {
    data,
    previousOverview,
    groupedDetails,
    missingDataVideos,
    loading,
    saving,
    currentDate,
    dateRange,
    changeDate,
    saveSolution,
    refresh,
    trackingConfig,
  } = useDailyReportData(projectId);

  // 当前 Tab
  const [activeTab, setActiveTab] = useState('overview');

  // 主题
  const { isDark } = useTheme();

  // 导出图片
  const exportRef = useRef<HTMLDivElement | null>(null);
  const { exporting, exportImage } = useExportImage(
    exportRef as React.RefObject<HTMLElement>,
    {
      filename: `日报概览-${data?.projectName || '项目'}-${currentDate}`,
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      pixelRatio: 2,
    }
  );

  // 将 groupedDetails 转为扁平数组
  const allDetails = useMemo(() => {
    return Object.values(groupedDetails).flat();
  }, [groupedDetails]);

  // 返回列表
  const handleBack = () => {
    navigate('/projects/daily-report');
  };

  // 日期变更
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      changeDate(date.format('YYYY-MM-DD'));
    }
  };

  // 查看达人趋势
  const handleViewTrend = (_collaborationId: string, _talentName: string) => {
    setActiveTab('trend');
    // TODO: 可以自动选中该达人
  };

  // Tab 配置
  const tabItems = useMemo(() => {
    const items = [
      {
        key: 'overview',
        label: (
          <span className="flex items-center gap-1.5">
            <BarChartOutlined />
            日报概览
          </span>
        ),
        children: (
          <DailyOverviewTab
            data={data}
            previousOverview={previousOverview}
            details={allDetails}
            missingDataVideos={missingDataVideos}
            onSaveSolution={saveSolution}
            onViewTrend={handleViewTrend}
            saving={saving}
            currentDate={currentDate}
            exportRef={exportRef as React.RefObject<HTMLDivElement>}
            isExporting={exporting}
          />
        ),
      },
      {
        key: 'trend',
        label: (
          <span className="flex items-center gap-1.5">
            <LineChartOutlined />
            达人趋势
          </span>
        ),
        children: (
          <TalentTrendTab
            details={allDetails}
            benchmarkCPM={trackingConfig?.benchmarkCPM || 30}
            platformQuotationCoefficients={data?.platformQuotationCoefficients}
          />
        ),
      },
      {
        key: 'fetch',
        label: (
          <span className="flex items-center gap-1.5">
            <CloudDownloadOutlined />
            数据抓取
            {missingDataVideos.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[var(--aw-warning-100)] text-[var(--aw-warning-600)]">
                {missingDataVideos.length}
              </span>
            )}
          </span>
        ),
        children: (
          <DataFetchTab
            projectId={projectId || ''}
            currentDate={currentDate}
            missingDataVideos={missingDataVideos}
            onFetchComplete={() => {
              // 不自动刷新，让用户查看抓取结果后手动刷新
            }}
          />
        ),
      },
    ];

    return items;
  }, [
    data,
    previousOverview,
    allDetails,
    missingDataVideos,
    saving,
    saveSolution,
    trackingConfig,
    projectId,
    refresh,
    currentDate,
    exporting,
  ]);

  if (!projectId) {
    return (
      <PageTransition>
        <Empty description="未找到项目" />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-[var(--aw-gray-50)] p-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            >
              返回列表
            </Button>
            <div className="h-4 w-px bg-[var(--aw-gray-300)]" />
            <h1 className="text-xl font-semibold text-[var(--aw-gray-900)]">
              {data?.projectName || '项目日报'}
            </h1>
          </div>

          <Space>
            <DatePicker
              value={dayjs(currentDate)}
              onChange={handleDateChange}
              allowClear={false}
              disabledDate={date => {
                if (dateRange.first && date.isBefore(dateRange.first, 'day')) {
                  return true;
                }
                if (date.isAfter(dayjs(), 'day')) {
                  return true;
                }
                return false;
              }}
            />
            <Button icon={<ReloadOutlined spin={loading} />} onClick={refresh}>
              刷新
            </Button>
            {activeTab === 'overview' && (
              <Button
                icon={<DownloadOutlined />}
                onClick={exportImage}
                loading={exporting}
              >
                导出图片
              </Button>
            )}
          </Space>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="rounded-xl border border-[var(--aw-gray-200)] bg-[var(--color-bg-elevated)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spin size="large" />
          </div>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="px-6"
            tabBarStyle={{
              marginBottom: 0,
              borderBottom: '1px solid var(--aw-gray-200)',
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default ProjectDailyReport;
