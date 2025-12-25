/**
 * 分组日报详情页
 *
 * 功能：
 * - 合并多个项目的日报数据
 * - 使用主项目名称作为日报标题
 * - 复用现有的日报概览和趋势组件
 */

import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  DatePicker,
  Button,
  Space,
  Spin,
  Empty,
  Tag,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageTransition } from '../../../components/PageTransition';
import { useGroupDailyReportData } from '../../../hooks/useGroupDailyReportData';
import { useDailyReportGroups } from '../../../hooks/useDailyReportGroups';
import { useExportImage } from '../../../hooks/useExportImage';
import { useTheme } from '../../../contexts/ThemeContext';
import { DailyOverviewTab, TalentTrendTab } from './tabs';

export function GroupDailyReport() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  // 获取分组信息
  const { loading: groupsLoading, getGroupById } = useDailyReportGroups();
  const group = useMemo(() => {
    if (!groupId) return null;
    return getGroupById(groupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, getGroupById]);

  // 分组日报数据
  const {
    data,
    previousOverview,
    groupedDetails,
    missingDataVideos,
    loading,
    currentDate,
    dateRange,
    changeDate,
    refresh,
    trackingConfig,
    groupName,
    projectCount,
  } = useGroupDailyReportData(group || null);

  // 当前 Tab
  const [activeTab, setActiveTab] = useState('overview');

  // 主题
  const { isDark } = useTheme();

  // 导出图片
  const exportRef = useRef<HTMLDivElement | null>(null);
  const { exporting, exportImage } = useExportImage(
    exportRef as React.RefObject<HTMLElement>,
    {
      filename: `日报概览-${groupName || '分组'}-${currentDate}`,
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
  };

  // 分组不存在的处理
  const notFound = !groupsLoading && groupId && !group;

  // Tab 配置（分组日报不显示数据抓取 Tab）
  const tabItems = useMemo(() => {
    return [
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
            onSaveSolution={() => Promise.resolve(false)} // 分组模式不支持保存备注
            onViewTrend={handleViewTrend}
            saving={false}
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
    ];
  }, [
    data,
    previousOverview,
    allDetails,
    missingDataVideos,
    trackingConfig,
    currentDate,
    exporting,
  ]);

  if (!groupId) {
    return (
      <PageTransition>
        <Empty description="未找到分组" />
      </PageTransition>
    );
  }

  if (groupsLoading) {
    return (
      <PageTransition className="min-h-screen bg-[var(--aw-gray-50)] p-6">
        <div className="flex items-center justify-center py-24">
          <Spin size="large" />
        </div>
      </PageTransition>
    );
  }

  if (notFound) {
    return (
      <PageTransition className="min-h-screen bg-[var(--aw-gray-50)] p-6">
        <div className="mb-6">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
        </div>
        <Empty description="分组不存在或已被删除">
          <Button type="primary" onClick={handleBack}>
            返回日报列表
          </Button>
        </Empty>
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
            <div className="flex items-center gap-2">
              <AppstoreOutlined className="text-primary-500" />
              <h1 className="text-xl font-semibold text-[var(--aw-gray-900)]">
                {groupName || '分组日报'}
              </h1>
              <Tooltip title={`此日报合并了 ${projectCount} 个项目的数据`}>
                <Tag color="blue" className="ml-2">
                  <InfoCircleOutlined className="mr-1" />
                  {projectCount} 个项目
                </Tag>
              </Tooltip>
            </div>
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
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => refresh()}
            >
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

export default GroupDailyReport;
