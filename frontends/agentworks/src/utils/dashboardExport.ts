/**
 * 项目看板 Excel 导出工具
 * @module utils/dashboardExport
 */

import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type {
  DashboardExportData,
  SummaryStats,
  PlatformGroupStats,
  StatusGroupStats,
  CustomerGroupStats,
  ProjectWithFinance,
  DashboardFilters,
} from '../types/dashboard';
import { PROJECT_STATUS_LABELS } from '../types/project';
import { PLATFORM_NAMES } from '../types/talent';

/**
 * 格式化金额（分 → 元，保留2位小数）
 */
function formatMoney(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * 格式化百分比
 */
function formatPercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * 生成汇总统计 Sheet 数据
 */
function generateSummarySheet(
  summary: SummaryStats | null
): (string | number)[][] {
  if (!summary) {
    return [['暂无数据']];
  }

  return [
    ['指标', '数值'],
    ['项目数', summary.projectCount],
    ['达人数', summary.collaborationCount],
    ['已发布数', summary.publishedCount],
    ['执行金额', formatMoney(summary.totalAmount)],
    ['总收入', formatMoney(summary.totalRevenue)],
    ['总成本', formatMoney(summary.totalCost)],
    ['返点收入', formatMoney(summary.totalRebateIncome)],
    ['基础利润', formatMoney(summary.baseProfit)],
    ['利润率', formatPercent(summary.baseProfitRate)],
  ];
}

/**
 * 生成按平台统计 Sheet 数据
 */
function generatePlatformSheet(
  stats: PlatformGroupStats[]
): (string | number)[][] {
  const headers = [
    '平台',
    '项目数',
    '达人数',
    '已发布数',
    '执行金额',
    '收入',
    '成本',
    '返点收入',
    '利润',
    '利润率',
  ];

  const rows = stats.map(s => [
    s.platformName,
    s.projectCount,
    s.collaborationCount,
    s.publishedCount,
    formatMoney(s.totalAmount),
    formatMoney(s.totalRevenue),
    formatMoney(s.totalCost),
    formatMoney(s.totalRebateIncome),
    formatMoney(s.totalProfit),
    formatPercent(s.profitRate),
  ]);

  return [headers, ...rows];
}

/**
 * 生成按状态统计 Sheet 数据
 */
function generateStatusSheet(stats: StatusGroupStats[]): (string | number)[][] {
  const headers = [
    '状态',
    '项目数',
    '达人数',
    '已发布数',
    '执行金额',
    '收入',
    '成本',
    '返点收入',
    '利润',
    '利润率',
  ];

  const rows = stats.map(s => [
    s.statusLabel,
    s.projectCount,
    s.collaborationCount,
    s.publishedCount,
    formatMoney(s.totalAmount),
    formatMoney(s.totalRevenue),
    formatMoney(s.totalCost),
    formatMoney(s.totalRebateIncome),
    formatMoney(s.totalProfit),
    formatPercent(s.profitRate),
  ]);

  return [headers, ...rows];
}

/**
 * 生成按客户统计 Sheet 数据
 */
function generateCustomerSheet(
  stats: CustomerGroupStats[]
): (string | number)[][] {
  const headers = [
    '客户',
    '项目数',
    '达人数',
    '已发布数',
    '执行金额',
    '收入',
    '成本',
    '返点收入',
    '利润',
    '利润率',
  ];

  const rows = stats.map(s => [
    s.customerName,
    s.projectCount,
    s.collaborationCount,
    s.publishedCount,
    formatMoney(s.totalAmount),
    formatMoney(s.totalRevenue),
    formatMoney(s.totalCost),
    formatMoney(s.totalRebateIncome),
    formatMoney(s.totalProfit),
    formatPercent(s.profitRate),
  ]);

  return [headers, ...rows];
}

/**
 * 生成项目明细 Sheet 数据
 */
function generateProjectsSheet(
  projects: ProjectWithFinance[]
): (string | number)[][] {
  const headers = [
    '项目名称',
    '项目编号',
    '客户',
    '平台',
    '状态',
    '业务周期',
    '达人数',
    '已发布',
    '执行金额',
    '收入',
    '成本',
    '返点收入',
    '基础利润',
    '基础利润率',
    '资金占用费',
    '净利润',
    '净利润率',
  ];

  const rows = projects.map(p => [
    p.name,
    p.projectCode || '-',
    p.customerName || '-',
    p.platforms.map(pl => PLATFORM_NAMES[pl] || pl).join('、'),
    PROJECT_STATUS_LABELS[p.status] || p.status,
    `${p.year}年${p.month}月`,
    p.financeStats?.collaborationCount ?? p.stats?.collaborationCount ?? 0,
    p.financeStats?.publishedCount ?? p.stats?.publishedCount ?? 0,
    formatMoney(p.financeStats?.totalAmount ?? p.stats?.totalAmount ?? 0),
    formatMoney(p.financeStats?.revenue ?? 0),
    formatMoney(p.financeStats?.cost ?? 0),
    formatMoney(p.financeStats?.rebateIncome ?? 0),
    formatMoney(p.financeStats?.profit ?? 0),
    p.financeStats?.profitRate !== undefined
      ? formatPercent(p.financeStats.profitRate)
      : '-',
    formatMoney(p.financeStats?.fundsOccupation ?? 0),
    formatMoney(p.financeStats?.netProfit ?? 0),
    p.financeStats?.netProfitRate !== undefined
      ? formatPercent(p.financeStats.netProfitRate)
      : '-',
  ]);

  return [headers, ...rows];
}

/**
 * 生成筛选条件说明
 */
function generateFilterInfo(filters: DashboardFilters): string {
  const parts: string[] = [];

  if (filters.startYear && filters.startMonth) {
    const periodType = filters.useFinancialPeriod ? '财务周期' : '业务周期';
    if (filters.endYear && filters.endMonth) {
      parts.push(
        `${periodType}: ${filters.startYear}年${filters.startMonth}月 - ${filters.endYear}年${filters.endMonth}月`
      );
    } else {
      parts.push(
        `${periodType}: ${filters.startYear}年${filters.startMonth}月`
      );
    }
  }

  if (filters.statuses?.length) {
    parts.push(
      `状态: ${filters.statuses.map(s => PROJECT_STATUS_LABELS[s]).join('、')}`
    );
  }

  if (filters.platforms?.length) {
    parts.push(
      `平台: ${filters.platforms.map(p => PLATFORM_NAMES[p] || p).join('、')}`
    );
  }

  return parts.length > 0 ? parts.join(' | ') : '全部数据';
}

/**
 * 导出项目看板数据到 Excel
 */
export function exportDashboardToExcel(data: DashboardExportData): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 汇总统计
  const summaryData = generateSummarySheet(data.summary);
  // 添加筛选条件说明
  summaryData.unshift(['筛选条件', generateFilterInfo(data.filters)]);
  summaryData.unshift(['导出时间', data.exportedAt]);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  // 设置列宽
  summarySheet['!cols'] = [{ wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '汇总统计');

  // Sheet 2: 按平台统计
  if (data.platformStats.length > 0) {
    const platformData = generatePlatformSheet(data.platformStats);
    const platformSheet = XLSX.utils.aoa_to_sheet(platformData);
    platformSheet['!cols'] = [
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, platformSheet, '按平台统计');
  }

  // Sheet 3: 按状态统计
  if (data.statusStats.length > 0) {
    const statusData = generateStatusSheet(data.statusStats);
    const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
    statusSheet['!cols'] = [
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, statusSheet, '按状态统计');
  }

  // Sheet 4: 按客户统计
  if (data.customerStats.length > 0) {
    const customerData = generateCustomerSheet(data.customerStats);
    const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
    customerSheet['!cols'] = [
      { wch: 20 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, customerSheet, '按客户统计');
  }

  // Sheet 5: 项目明细
  if (data.projects.length > 0) {
    const projectsData = generateProjectsSheet(data.projects);
    const projectsSheet = XLSX.utils.aoa_to_sheet(projectsData);
    projectsSheet['!cols'] = [
      { wch: 25 }, // 项目名称
      { wch: 15 }, // 项目编号
      { wch: 15 }, // 客户
      { wch: 15 }, // 平台
      { wch: 10 }, // 状态
      { wch: 12 }, // 业务周期
      { wch: 8 }, // 达人数
      { wch: 8 }, // 已发布
      { wch: 12 }, // 执行金额
      { wch: 12 }, // 收入
      { wch: 12 }, // 成本
      { wch: 12 }, // 返点收入
      { wch: 12 }, // 基础利润
      { wch: 12 }, // 基础利润率
      { wch: 12 }, // 资金占用费
      { wch: 12 }, // 净利润
      { wch: 12 }, // 净利润率
    ];
    XLSX.utils.book_append_sheet(workbook, projectsSheet, '项目明细');
  }

  // 生成文件名并下载
  const fileName = `项目看板_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
