/**
 * @module talent-view
 * @description Talent collaboration view module for project analysis
 * @version 1.0.0
 *
 * Features:
 * - Talent ranking by collaboration count
 * - Per-talent works chart with video links
 * - Xingtu profile link support
 */

import { formatNumber, formatCurrency } from './utils.js';
import { getDataPeriod, getPeriodFieldName } from './state-manager.js';

// 效果达成有效状态：只计算"视频已发布"（与后端 API 保持一致）
const EFFECT_VALID_STATUS = '视频已发布';

// 达人列表显示状态（视频已发布 + 客户已定档）
const DISPLAY_STATUSES = ['视频已发布', '客户已定档'];

// 星图主页URL模板
const XINGTU_PROFILE_URL = 'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/';

// 抖音视频URL模板
const DOUYIN_VIDEO_URL = 'https://www.douyin.com/video/';

// Chart.js 实例
let talentWorksChart = null;

// 当前选中的达人数据
let selectedTalentData = null;

// 当前渲染的达人列表（用于详情查找）
let currentTalentsList = [];

// 完整的达人列表（筛选前）
let allTalentsList = [];

// 达人视角筛选状态
let talentFilters = {
  selectedProjectIds: [],  // 空数组表示全选
  searchKeyword: '',       // 达人名称搜索关键词
  minCollabCount: 0,       // 最小合作次数 (0 表示不限)
  cpmRange: '',            // CPM区间 ('', '0-10', '10-20', '20-50', '50-')
  dateStart: '',           // 发布时间开始
  dateEnd: ''              // 发布时间结束
};

// 所有项目（用于项目选择器）
let allProjectsForTalent = [];

// 分页状态
let talentPagination = {
  currentPage: 1,
  itemsPerPage: 10,
  totalItems: 0
};

// DOM 元素缓存
const elements = {
  talentViewSection: null,
  talentKpiCount: null,
  talentKpiCollaborations: null,
  talentKpiViews: null,
  talentKpiCpm: null,
  talentSortSelect: null,
  talentRankingBody: null,
  talentNoData: null,
  talentPaginationContainer: null,
  // 筛选元素
  talentProjectDropdownBtn: null,
  talentProjectDropdownMenu: null,
  talentProjectOptions: null,
  talentProjectSearchInput: null,
  talentSelectAllProjects: null,
  talentClearAllProjects: null,
  talentSelectedProjectsText: null,
  talentSearchInput: null,
  talentApplyFiltersBtn: null,
  talentResetFiltersBtn: null,
  // 新增筛选元素
  talentCollabCountFilter: null,
  talentCpmFilter: null,
  talentDateStart: null,
  talentDateEnd: null,
  // 弹窗元素
  talentDetailModal: null,
  talentModalBackdrop: null,
  talentModalClose: null,
  talentModalTitle: null,
  talentModalStats: null,
  talentModalSummary: null,
  talentWorksChart: null,
  talentWorksBody: null,
  talentChartLeftAxis: null,
  talentChartRightAxis: null
};

/**
 * Initialize DOM element references
 */
export function initTalentViewElements() {
  elements.talentViewSection = document.getElementById('talent-view-section');
  elements.talentKpiCount = document.getElementById('talent-kpi-count');
  elements.talentKpiCollaborations = document.getElementById('talent-kpi-collaborations');
  elements.talentKpiViews = document.getElementById('talent-kpi-views');
  elements.talentKpiCpm = document.getElementById('talent-kpi-cpm');
  elements.talentSortSelect = document.getElementById('talent-sort-select');
  elements.talentRankingBody = document.getElementById('talent-ranking-body');
  elements.talentNoData = document.getElementById('talent-no-data');
  elements.talentPaginationContainer = document.getElementById('talent-pagination');
  // 筛选元素
  elements.talentProjectDropdownBtn = document.getElementById('talent-project-dropdown-btn');
  elements.talentProjectDropdownMenu = document.getElementById('talent-project-dropdown-menu');
  elements.talentProjectOptions = document.getElementById('talent-project-options');
  elements.talentProjectSearchInput = document.getElementById('talent-project-search-input');
  elements.talentSelectAllProjects = document.getElementById('talent-select-all-projects');
  elements.talentClearAllProjects = document.getElementById('talent-clear-all-projects');
  elements.talentSelectedProjectsText = document.getElementById('talent-selected-projects-text');
  elements.talentSearchInput = document.getElementById('talent-search-input');
  elements.talentApplyFiltersBtn = document.getElementById('talent-apply-filters-btn');
  elements.talentResetFiltersBtn = document.getElementById('talent-reset-filters-btn');
  // 新增筛选元素
  elements.talentCollabCountFilter = document.getElementById('talent-collab-count-filter');
  elements.talentCpmFilter = document.getElementById('talent-cpm-filter');
  elements.talentDateStart = document.getElementById('talent-date-start');
  elements.talentDateEnd = document.getElementById('talent-date-end');
  // 弹窗元素
  elements.talentDetailModal = document.getElementById('talent-detail-modal');
  elements.talentModalBackdrop = document.getElementById('talent-modal-backdrop');
  elements.talentModalClose = document.getElementById('talent-modal-close');
  elements.talentModalTitle = document.getElementById('talent-modal-title');
  elements.talentModalStats = document.getElementById('talent-modal-stats');
  elements.talentModalSummary = document.getElementById('talent-modal-summary');
  elements.talentWorksChart = document.getElementById('talent-works-chart');
  elements.talentWorksBody = document.getElementById('talent-works-body');
  elements.talentChartLeftAxis = document.getElementById('talent-chart-left-axis');
  elements.talentChartRightAxis = document.getElementById('talent-chart-right-axis');

  // Setup event listeners
  setupTalentViewEventListeners();
}

/**
 * Setup event listeners for talent view
 */
function setupTalentViewEventListeners() {
  // Sort selector change
  if (elements.talentSortSelect) {
    elements.talentSortSelect.addEventListener('change', () => {
      // Trigger re-render with new sort
      const event = new CustomEvent('talentSortChange', {
        detail: { sortBy: elements.talentSortSelect.value }
      });
      document.dispatchEvent(event);
    });
  }

  // ===== 筛选相关事件 =====

  // 项目下拉菜单切换
  if (elements.talentProjectDropdownBtn) {
    elements.talentProjectDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.talentProjectDropdownMenu?.classList.toggle('hidden');
    });
  }

  // 全选项目
  if (elements.talentSelectAllProjects) {
    elements.talentSelectAllProjects.addEventListener('click', () => {
      setAllTalentProjectCheckboxes(true);
      updateTalentProjectSelectionText();
    });
  }

  // 清空项目选择
  if (elements.talentClearAllProjects) {
    elements.talentClearAllProjects.addEventListener('click', () => {
      setAllTalentProjectCheckboxes(false);
      updateTalentProjectSelectionText();
    });
  }

  // 项目搜索
  if (elements.talentProjectSearchInput) {
    elements.talentProjectSearchInput.addEventListener('input', (e) => {
      filterTalentProjectOptions(e.target.value);
    });
  }

  // 项目复选框变化
  if (elements.talentProjectOptions) {
    elements.talentProjectOptions.addEventListener('change', () => {
      updateTalentProjectSelectionText();
    });
  }

  // 点击外部关闭项目下拉
  document.addEventListener('click', (e) => {
    if (elements.talentProjectDropdownBtn && elements.talentProjectDropdownMenu) {
      if (!elements.talentProjectDropdownBtn.contains(e.target) &&
          !elements.talentProjectDropdownMenu.contains(e.target)) {
        elements.talentProjectDropdownMenu.classList.add('hidden');
      }
    }
  });

  // 应用筛选按钮
  if (elements.talentApplyFiltersBtn) {
    elements.talentApplyFiltersBtn.addEventListener('click', applyTalentFilters);
  }

  // 重置筛选按钮
  if (elements.talentResetFiltersBtn) {
    elements.talentResetFiltersBtn.addEventListener('click', resetTalentFilters);
  }

  // 达人搜索回车触发筛选
  if (elements.talentSearchInput) {
    elements.talentSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyTalentFilters();
      }
    });
  }

  // ===== 新增筛选元素事件 =====

  // 合作次数、CPM 下拉变化时自动应用筛选
  if (elements.talentCollabCountFilter) {
    elements.talentCollabCountFilter.addEventListener('change', applyTalentFilters);
  }
  if (elements.talentCpmFilter) {
    elements.talentCpmFilter.addEventListener('change', applyTalentFilters);
  }

  // 日期选择变化时自动应用筛选
  if (elements.talentDateStart) {
    elements.talentDateStart.addEventListener('change', applyTalentFilters);
  }
  if (elements.talentDateEnd) {
    elements.talentDateEnd.addEventListener('change', applyTalentFilters);
  }

  // ===== 弹窗相关事件 =====

  // 弹窗关闭按钮
  if (elements.talentModalClose) {
    elements.talentModalClose.addEventListener('click', closeTalentDetailModal);
  }

  // 点击背景遮罩关闭弹窗
  if (elements.talentModalBackdrop) {
    elements.talentModalBackdrop.addEventListener('click', closeTalentDetailModal);
  }

  // ESC 键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.talentDetailModal && !elements.talentDetailModal.classList.contains('hidden')) {
      closeTalentDetailModal();
    }
  });
}

/**
 * Show talent view section
 */
export function showTalentViewSection() {
  if (elements.talentViewSection) {
    elements.talentViewSection.classList.remove('hidden');
  }
}

/**
 * Hide talent view section
 */
export function hideTalentViewSection() {
  if (elements.talentViewSection) {
    elements.talentViewSection.classList.add('hidden');
  }
}

/**
 * Aggregate talent data from effect performance results
 * @param {Array} effectResults - Array of { projectId, data, project } objects
 * @returns {Object} { talents: Array, summary: Object }
 */
export function aggregateTalentData(effectResults) {
  const talentMap = new Map();

  // 获取当前数据周期
  const period = getDataPeriod();

  // 计算交付日期阈值（与客户视角保持一致）
  // T+7: 项目交付，T+21: 财务交付
  const periodDays = period === 't7' ? 7 : 21;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 动态字段名
  const viewsField = `${period}_views`;
  const interactionsField = `${period}_interactions`;
  const cpmField = `${period}_cpm`;
  const componentImpressionsField = `${period}_componentImpressions`;
  const componentClicksField = `${period}_componentClicks`;
  const completionRateField = `${period}_completionRate`;
  const likesField = `${period}_likes`;
  const commentsField = `${period}_comments`;
  const sharesField = `${period}_shares`;
  const ctrField = `${period}_ctr`;
  const interactionRateField = `${period}_interactionRate`;

  // Debug: 收集所有状态值以便诊断
  const allStatuses = new Set();
  let totalTalentRecords = 0;
  let filteredOut = 0;
  let filteredOutByDeliveryDate = 0;

  // Debug: 按项目统计播放量
  const projectViewsMap = new Map();

  // Debug: 记录被排除的项目
  const excludedProjects = {
    noDeliveryDate: [],
    deliveryDateNotReached: []
  };

  effectResults.forEach(({ data, project }) => {
    if (!data?.talents) return;

    // === 交付日期过滤（与客户视角保持一致）===
    const lastPublishDate = data.overall?.lastPublishDate;

    // 无发布日期的项目跳过
    if (!lastPublishDate) {
      excludedProjects.noDeliveryDate.push({
        name: project.name || project.id,
        id: project.id
      });
      return;
    }

    // 检查交付日期是否已到
    const lastPublishDateObj = new Date(lastPublishDate);
    const deliveryDate = new Date(lastPublishDateObj);
    deliveryDate.setDate(deliveryDate.getDate() + periodDays);

    if (deliveryDate > today) {
      excludedProjects.deliveryDateNotReached.push({
        name: project.name || project.id,
        id: project.id,
        deliveryDate: deliveryDate.toISOString().split('T')[0]
      });
      return;
    }

    // 初始化项目播放量统计
    if (!projectViewsMap.has(project.id)) {
      projectViewsMap.set(project.id, {
        name: project.name || project.id,
        talentViews: 0,
        overallViews: data.overall?.[`${period}_totalViews`] || 0,
        talentCount: 0,
        validTalentCount: 0
      });
    }
    const projectStats = projectViewsMap.get(project.id);

    data.talents.forEach(talent => {
      totalTalentRecords++;
      allStatuses.add(talent.status);

      projectStats.talentCount++;

      // 效果达成统计：只计算"视频已发布"状态（与后端 API 保持一致）
      // 这确保 CPM 计算与客户视角一致
      const isEffectValid = talent.status === EFFECT_VALID_STATUS;

      // 跳过非"视频已发布"和"客户已定档"状态的合作（不在达人列表中显示）
      if (!DISPLAY_STATUSES.includes(talent.status)) {
        filteredOut++;
        return;
      }

      const talentId = talent.talentId;
      if (!talentId) return;

      // 统计该项目的有效达人播放量（只计算视频已发布）
      if (isEffectValid) {
        const talentViews = talent[viewsField] || 0;
        projectStats.talentViews += talentViews;
        projectStats.validTalentCount++;
      }

      if (!talentMap.has(talentId)) {
        talentMap.set(talentId, {
          talentId,
          talentName: talent.talentName,
          xingtuId: talent.xingtuId,
          collaborations: [],
          collaborationCount: 0,
          totalViews: 0,
          totalInteractions: 0,
          totalExecutionAmount: 0,
          // 新增统计字段
          totalComponentImpressions: 0,
          totalComponentClicks: 0,
          totalCompletionViews: 0,  // 完播量 = 播放量 × 完播率
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0
        });
      }

      const talentData = talentMap.get(talentId);

      // 动态获取字段值
      const views = talent[viewsField] || 0;
      const interactions = talent[interactionsField] || 0;
      const cpm = talent[cpmField] || 0;
      const componentImpressions = talent[componentImpressionsField] || 0;
      const componentClicks = talent[componentClicksField] || 0;
      const completionRate = talent[completionRateField] || 0;
      const likes = talent[likesField] || 0;
      const comments = talent[commentsField] || 0;
      const shares = talent[sharesField] || 0;
      const ctr = talent[ctrField] || 0;
      const interactionRate = talent[interactionRateField] || 0;

      // 计算完播量
      const completionViews = views * completionRate;

      // Add collaboration details - 存储为通用字段名，便于后续处理
      // 同时保留动态周期字段供图表使用
      const collabData = {
        collaborationId: talent.id,
        projectId: project.id,
        projectName: project.name || project.id,
        publishDate: talent.publishDate,
        status: talent.status,
        platformWorkId: talent.platformWorkId,
        executionAmount: talent.executionAmount || 0,
        isEffectValid  // 标记是否纳入效果统计
      };

      // 添加动态周期字段（用于图表和表格显示）
      collabData[viewsField] = views;
      collabData[interactionsField] = interactions;
      collabData[cpmField] = cpm;
      collabData[componentImpressionsField] = componentImpressions;
      collabData[componentClicksField] = componentClicks;
      collabData[completionRateField] = completionRate;
      collabData[`${period}_completionViews`] = completionViews;
      collabData[likesField] = likes;
      collabData[commentsField] = comments;
      collabData[sharesField] = shares;
      collabData[ctrField] = ctr;
      collabData[interactionRateField] = interactionRate;

      talentData.collaborations.push(collabData);

      talentData.collaborationCount++;

      // 效果统计：只累加"视频已发布"状态的数据（与后端 API 保持一致）
      if (isEffectValid) {
        talentData.totalViews += views;
        talentData.totalInteractions += interactions;
        talentData.totalExecutionAmount += talent.executionAmount || 0;
        // 累加新字段
        talentData.totalComponentImpressions += componentImpressions;
        talentData.totalComponentClicks += componentClicks;
        talentData.totalCompletionViews += completionViews;
        talentData.totalLikes += likes;
        talentData.totalComments += comments;
        talentData.totalShares += shares;
      }
    });
  });

  // Debug log 状态过滤结果
  const periodLabel = period === 't7' ? 'T+7' : 'T+21';
  console.log(`[Talent View] ========== 达人视角数据过滤详情 (${periodLabel}) ==========`);
  console.log(`[Talent View] 数据周期: ${periodLabel}, 交付天数: ${periodDays}天`);
  console.log(`[Talent View] 总项目数: ${effectResults.length}`);
  console.log(`[Talent View] 纳入统计项目数: ${projectViewsMap.size}`);

  if (excludedProjects.noDeliveryDate.length > 0) {
    console.log(`[Talent View] 无交付日期 (${excludedProjects.noDeliveryDate.length}个):`,
      excludedProjects.noDeliveryDate.map(p => p.name));
  }

  if (excludedProjects.deliveryDateNotReached.length > 0) {
    console.log(`[Talent View] 交付日期未到 (${excludedProjects.deliveryDateNotReached.length}个):`,
      excludedProjects.deliveryDateNotReached.map(p => `${p.name}(${p.deliveryDate})`));
  }

  console.log('[Talent View] 状态过滤:', {
    totalTalentRecords,
    filteredOut,
    passedFilter: totalTalentRecords - filteredOut,
    allStatuses: Array.from(allStatuses),
    displayStatuses: DISPLAY_STATUSES,
    effectValidStatus: EFFECT_VALID_STATUS
  });

  // Debug: 输出按项目的播放量对比
  console.log(`[Talent View] ========== 达人视角按项目播放量 ==========`);
  let totalTalentViewsSum = 0;
  let totalOverallViewsSum = 0;
  const projectViewsList = Array.from(projectViewsMap.values())
    .sort((a, b) => b.talentViews - a.talentViews);

  projectViewsList.forEach(p => {
    totalTalentViewsSum += p.talentViews;
    totalOverallViewsSum += p.overallViews;
    const diff = p.talentViews - p.overallViews;
    if (Math.abs(diff) > 1000000) { // 只显示差异超过100万的
      console.log(`[Talent View] ${p.name}: 达人合计=${(p.talentViews/100000000).toFixed(2)}亿, overall=${(p.overallViews/100000000).toFixed(2)}亿, 差异=${(diff/100000000).toFixed(2)}亿`);
    }
  });
  console.log(`[Talent View] 总计: 达人合计=${(totalTalentViewsSum/100000000).toFixed(2)}亿, overall合计=${(totalOverallViewsSum/100000000).toFixed(2)}亿`);
  console.log(`[Talent View] ==========================================`);

  // Calculate average metrics for each talent
  const talents = Array.from(talentMap.values()).map(talent => {
    // 平均 CPM（加权）
    talent.avgCPM = talent.totalViews > 0
      ? (talent.totalExecutionAmount / talent.totalViews) * 1000
      : 0;
    // 组件点击率
    talent.avgComponentCTR = talent.totalComponentImpressions > 0
      ? talent.totalComponentClicks / talent.totalComponentImpressions
      : 0;
    // 加权平均完播率
    talent.avgCompletionRate = talent.totalViews > 0
      ? talent.totalCompletionViews / talent.totalViews
      : 0;
    return talent;
  });

  // Calculate summary
  const totalComponentImpressions = talents.reduce((sum, t) => sum + t.totalComponentImpressions, 0);
  const totalComponentClicks = talents.reduce((sum, t) => sum + t.totalComponentClicks, 0);
  const totalCompletionViews = talents.reduce((sum, t) => sum + t.totalCompletionViews, 0);
  const totalViews = talents.reduce((sum, t) => sum + t.totalViews, 0);
  const totalExecutionAmount = talents.reduce((sum, t) => sum + t.totalExecutionAmount, 0);

  const summary = {
    uniqueTalentCount: talents.length,
    totalCollaborations: talents.reduce((sum, t) => sum + t.collaborationCount, 0),
    totalViews,
    totalExecutionAmount,
    avgCPM: totalViews > 0 ? (totalExecutionAmount / totalViews) * 1000 : 0,
    // 新增汇总指标
    totalComponentImpressions,
    totalComponentClicks,
    avgComponentCTR: totalComponentImpressions > 0 ? totalComponentClicks / totalComponentImpressions : 0,
    avgCompletionRate: totalViews > 0 ? totalCompletionViews / totalViews : 0
  };

  return { talents, summary };
}

/**
 * Sort talents by specified field
 * @param {Array} talents - Array of talent objects
 * @param {string} sortBy - Sort field ('collaborations', 'views', 'cpm')
 * @returns {Array} Sorted talents array
 */
export function sortTalents(talents, sortBy = 'collaborations') {
  const sorted = [...talents];

  switch (sortBy) {
    case 'views':
      sorted.sort((a, b) => b.totalViews - a.totalViews);
      break;
    case 'cpm':
      // Lower CPM is better, so sort ascending
      sorted.sort((a, b) => {
        if (a.avgCPM === 0) return 1;
        if (b.avgCPM === 0) return -1;
        return a.avgCPM - b.avgCPM;
      });
      break;
    case 'collaborations':
    default:
      sorted.sort((a, b) => b.collaborationCount - a.collaborationCount);
      break;
  }

  return sorted;
}

/**
 * Format large numbers with Chinese units
 * @param {number} value - Number to format
 * @returns {string} Formatted string
 */
function formatLargeNumber(value) {
  if (value >= 100000000) {
    return (value / 100000000).toFixed(2) + '亿';
  } else if (value >= 10000) {
    return (value / 10000).toFixed(1) + '万';
  }
  return formatNumber(value);
}

/**
 * Render talent KPI cards
 * @param {Object} summary - Talent summary data
 */
export function renderTalentKpiCards(summary) {
  if (elements.talentKpiCount) {
    elements.talentKpiCount.textContent = summary.uniqueTalentCount;
  }

  if (elements.talentKpiCollaborations) {
    elements.talentKpiCollaborations.textContent = summary.totalCollaborations;
  }

  if (elements.talentKpiViews) {
    elements.talentKpiViews.textContent = summary.totalViews > 0
      ? formatLargeNumber(summary.totalViews)
      : '--';
  }

  if (elements.talentKpiCpm) {
    elements.talentKpiCpm.textContent = summary.avgCPM > 0
      ? `¥${summary.avgCPM.toFixed(1)}`
      : '--';
  }
}

/**
 * Render talent ranking table with pagination
 * @param {Array} talents - Sorted array of talent objects
 * @param {boolean} resetPage - Whether to reset to page 1
 */
export function renderTalentRankingTable(talents, resetPage = true) {
  if (!elements.talentRankingBody) return;

  // 保存完整列表供详情查找
  currentTalentsList = talents;

  if (talents.length === 0) {
    elements.talentRankingBody.innerHTML = '';
    if (elements.talentNoData) {
      elements.talentNoData.classList.remove('hidden');
    }
    renderTalentPagination(0);
    return;
  }

  if (elements.talentNoData) {
    elements.talentNoData.classList.add('hidden');
  }

  // 重置页码
  if (resetPage) {
    talentPagination.currentPage = 1;
  }
  talentPagination.totalItems = talents.length;

  // 计算当前页数据
  const startIndex = (talentPagination.currentPage - 1) * talentPagination.itemsPerPage;
  const endIndex = startIndex + talentPagination.itemsPerPage;
  const pageData = talents.slice(startIndex, endIndex);

  elements.talentRankingBody.innerHTML = pageData.map((talent, index) => {
    // 排名基于总列表位置，不是当前页位置
    const rank = startIndex + index + 1;
    const rankBadge = rank <= 3
      ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${rank === 1 ? 'bg-yellow-100 text-yellow-800' : rank === 2 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-800'}">${rank}</span>`
      : `<span class="text-gray-500 text-sm">${rank}</span>`;

    const xingtuLink = talent.xingtuId
      ? `<a href="${XINGTU_PROFILE_URL}${talent.xingtuId}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-xs">${talent.xingtuId}</a>`
      : '<span class="text-gray-400 text-xs">--</span>';

    // 格式化完播率和组件点击率为百分比
    const completionRateText = talent.avgCompletionRate > 0
      ? `${(talent.avgCompletionRate * 100).toFixed(1)}%`
      : '--';
    const componentCTRText = talent.avgComponentCTR > 0
      ? `${(talent.avgComponentCTR * 100).toFixed(2)}%`
      : '--';

    // 完播率颜色 (高完播率用绿色)
    const completionRateClass = talent.avgCompletionRate >= 0.1 ? 'text-green-600 font-medium' :
                                talent.avgCompletionRate > 0 ? 'text-gray-700' : 'text-gray-400';

    // 组件点击率颜色 (高点击率用绿色)
    const componentCTRClass = talent.avgComponentCTR >= 0.01 ? 'text-green-600 font-medium' :
                              talent.avgComponentCTR > 0 ? 'text-gray-700' : 'text-gray-400';

    return `
      <tr class="hover:bg-gray-50 cursor-pointer talent-row" data-talent-id="${talent.talentId}">
        <td class="px-3 py-2.5 whitespace-nowrap text-center">${rankBadge}</td>
        <td class="px-3 py-2.5 whitespace-nowrap">
          <span class="font-medium text-gray-900 text-sm">${talent.talentName}</span>
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap">${xingtuLink}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${talent.collaborationCount}次
          </span>
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-right text-sm text-gray-700">
          ${talent.totalViews > 0 ? formatLargeNumber(talent.totalViews) : '--'}
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-right text-sm ${completionRateClass}">
          ${completionRateText}
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-right text-sm ${componentCTRClass}">
          ${componentCTRText}
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-right text-sm ${talent.avgCPM > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}">
          ${talent.avgCPM > 0 ? '¥' + talent.avgCPM.toFixed(1) : '--'}
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-center">
          <button
            class="talent-detail-btn px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
            data-talent-id="${talent.talentId}"
          >
            详情
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // 绑定点击事件 - 使用事件委托
  bindTalentDetailEvents();

  // 渲染分页
  renderTalentPagination(talents.length);
}

/**
 * Bind click events for talent detail buttons using event delegation
 */
function bindTalentDetailEvents() {
  if (!elements.talentRankingBody) return;

  // 移除旧的事件监听器
  elements.talentRankingBody.removeEventListener('click', handleTalentDetailClick);
  // 添加新的事件监听器
  elements.talentRankingBody.addEventListener('click', handleTalentDetailClick);
}

/**
 * Handle talent detail click event
 * @param {Event} e - Click event
 */
function handleTalentDetailClick(e) {
  // 检查是否点击了详情按钮或整行
  const btn = e.target.closest('.talent-detail-btn');
  const row = e.target.closest('.talent-row');

  // 如果点击了链接，不触发详情
  if (e.target.closest('a')) return;

  let talentId = null;
  if (btn) {
    talentId = btn.dataset.talentId;
  } else if (row) {
    talentId = row.dataset.talentId;
  }

  if (talentId) {
    const talent = currentTalentsList.find(t => t.talentId === talentId);
    if (talent) {
      console.log('[Talent View] Opening detail for:', talent.talentName);
      showTalentWorksChart(talent);
    }
  }
}

/**
 * Render pagination controls for talent list
 * @param {number} totalItems - Total number of talents
 */
function renderTalentPagination(totalItems) {
  if (!elements.talentPaginationContainer) return;

  const totalPages = Math.ceil(totalItems / talentPagination.itemsPerPage);

  if (totalPages <= 1) {
    // 只显示总数，不显示分页按钮
    elements.talentPaginationContainer.innerHTML = totalItems > 0
      ? `<div class="text-sm text-gray-700">共 <span class="font-medium">${totalItems}</span> 位达人</div>`
      : '';
    return;
  }

  const { currentPage, itemsPerPage } = talentPagination;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // 计算页码显示
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  let html = `
    <div class="flex items-center justify-between">
      <div class="text-sm text-gray-700">
        显示 <span class="font-medium">${startItem}</span> 到 <span class="font-medium">${endItem}</span>，
        共 <span class="font-medium">${totalItems}</span> 位达人
      </div>
      <div class="flex items-center space-x-2">
        <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
          上一页
        </button>
  `;

  pageNumbers.forEach(pageNum => {
    if (pageNum === '...') {
      html += `<span class="px-2 text-gray-500">...</span>`;
    } else {
      html += `
        <button class="pagination-btn ${pageNum === currentPage ? 'active' : ''}" data-page="${pageNum}">
          ${pageNum}
        </button>
      `;
    }
  });

  html += `
        <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
          下一页
        </button>
      </div>
    </div>
  `;

  elements.talentPaginationContainer.innerHTML = html;

  // 绑定分页事件
  elements.talentPaginationContainer.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      if (target.disabled) return;
      const page = parseInt(target.dataset.page);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        talentPagination.currentPage = page;
        renderTalentRankingTable(currentTalentsList, false);
      }
    });
  });
}

/**
 * Calculate page numbers to display with ellipsis
 * @param {number} current - Current page
 * @param {number} total - Total pages
 * @returns {Array} Array of page numbers and '...'
 */
function getPageNumbers(current, total) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  let prev = 0;
  for (const i of range) {
    if (prev && i - prev > 1) {
      rangeWithDots.push('...');
    }
    rangeWithDots.push(i);
    prev = i;
  }

  return rangeWithDots;
}

/**
 * Show talent detail modal
 * @param {Object} talent - Talent data with collaborations
 */
function showTalentWorksChart(talent) {
  selectedTalentData = talent;

  // 打开弹窗
  if (elements.talentDetailModal) {
    elements.talentDetailModal.classList.remove('hidden');
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
  }

  if (elements.talentModalTitle) {
    elements.talentModalTitle.textContent = talent.talentName;
  }

  if (elements.talentModalStats) {
    elements.talentModalStats.textContent = `共 ${talent.collaborations.length} 个作品`;
  }

  // 渲染汇总统计卡片
  renderTalentSummaryCards(talent);

  // 绑定图表维度切换事件
  setupChartAxisEvents();

  // Render chart
  renderTalentWorksChart(talent.collaborations);

  // Render works table
  renderTalentWorksTable(talent.collaborations);
}

/**
 * Render talent summary cards in modal
 * @param {Object} talent - Talent data
 */
function renderTalentSummaryCards(talent) {
  if (!elements.talentModalSummary) return;

  const cards = [
    {
      label: '总播放量',
      value: talent.totalViews > 0 ? formatLargeNumber(talent.totalViews) : '--',
      color: 'text-blue-600'
    },
    {
      label: '平均完播率',
      value: talent.avgCompletionRate > 0 ? `${(talent.avgCompletionRate * 100).toFixed(1)}%` : '--',
      color: talent.avgCompletionRate >= 0.1 ? 'text-green-600' : 'text-gray-600'
    },
    {
      label: '组件点击率',
      value: talent.avgComponentCTR > 0 ? `${(talent.avgComponentCTR * 100).toFixed(2)}%` : '--',
      color: talent.avgComponentCTR >= 0.01 ? 'text-green-600' : 'text-gray-600'
    },
    {
      label: '平均CPM',
      value: talent.avgCPM > 0 ? `¥${talent.avgCPM.toFixed(1)}` : '--',
      color: 'text-amber-600'
    },
    {
      label: '总互动量',
      value: talent.totalInteractions > 0 ? formatLargeNumber(talent.totalInteractions) : '--',
      color: 'text-purple-600'
    },
    {
      label: '执行金额',
      value: talent.totalExecutionAmount > 0 ? `¥${formatLargeNumber(talent.totalExecutionAmount)}` : '--',
      color: 'text-gray-600'
    }
  ];

  elements.talentModalSummary.innerHTML = cards.map(card => `
    <div class="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <div class="text-xs text-gray-500 mb-1">${card.label}</div>
      <div class="text-lg font-semibold ${card.color}">${card.value}</div>
    </div>
  `).join('');
}

/**
 * Setup chart axis change events
 */
function setupChartAxisEvents() {
  // 移除旧事件（避免重复绑定）
  if (elements.talentChartLeftAxis) {
    elements.talentChartLeftAxis.removeEventListener('change', handleChartAxisChange);
    elements.talentChartLeftAxis.addEventListener('change', handleChartAxisChange);
  }
  if (elements.talentChartRightAxis) {
    elements.talentChartRightAxis.removeEventListener('change', handleChartAxisChange);
    elements.talentChartRightAxis.addEventListener('change', handleChartAxisChange);
  }
}

/**
 * Handle chart axis change event
 */
function handleChartAxisChange() {
  if (selectedTalentData) {
    renderTalentWorksChart(selectedTalentData.collaborations);
  }
}

/**
 * Close talent detail modal
 */
function closeTalentDetailModal() {
  if (elements.talentDetailModal) {
    elements.talentDetailModal.classList.add('hidden');
    // 恢复背景滚动
    document.body.style.overflow = '';
  }
  selectedTalentData = null;

  // 销毁图表释放内存
  if (talentWorksChart) {
    talentWorksChart.destroy();
    talentWorksChart = null;
  }
}

// 图表维度配置 - 使用 fieldBase 动态生成字段名
const CHART_AXIS_CONFIG = {
  // 左轴 - 绝对值类型
  views: { label: '播放量', fieldBase: 'views', color: 'rgba(79, 70, 229, 0.8)', format: 'number' },
  interactions: { label: '互动量', fieldBase: 'interactions', color: 'rgba(147, 51, 234, 0.8)', format: 'number' },
  likes: { label: '点赞数', fieldBase: 'likes', color: 'rgba(236, 72, 153, 0.8)', format: 'number' },
  comments: { label: '评论数', fieldBase: 'comments', color: 'rgba(34, 197, 94, 0.8)', format: 'number' },
  shares: { label: '分享数', fieldBase: 'shares', color: 'rgba(249, 115, 22, 0.8)', format: 'number' },
  // 右轴 - 比率/金额类型
  cpm: { label: 'CPM', fieldBase: 'cpm', color: 'rgba(245, 158, 11, 1)', format: 'currency' },
  completionRate: { label: '完播率', fieldBase: 'completionRate', color: 'rgba(16, 185, 129, 1)', format: 'percent' },
  componentCTR: { label: '组件点击率', fieldBase: null, color: 'rgba(59, 130, 246, 1)', format: 'percent', calculateDynamic: true },
  interactionRate: { label: '互动率', fieldBase: 'interactionRate', color: 'rgba(139, 92, 246, 1)', format: 'percent' }
};

/**
 * Get dynamic field name based on current data period
 * @param {string} fieldBase - Base field name (e.g., 'views', 'cpm')
 * @returns {string} Full field name (e.g., 't21_views', 't7_cpm')
 */
function getDynamicField(fieldBase) {
  const period = getDataPeriod();
  return `${period}_${fieldBase}`;
}

/**
 * Get chart value for a collaboration based on axis config
 * @param {Object} collab - Collaboration object
 * @param {Object} config - CHART_AXIS_CONFIG entry
 * @returns {number} Value for chart
 */
function getChartValue(collab, config) {
  if (config.calculateDynamic) {
    // 组件点击率需要动态计算
    const impressionsField = getDynamicField('componentImpressions');
    const clicksField = getDynamicField('componentClicks');
    const impressions = collab[impressionsField] || 0;
    const clicks = collab[clicksField] || 0;
    return impressions > 0 ? clicks / impressions : 0;
  }
  if (config.fieldBase) {
    const field = getDynamicField(config.fieldBase);
    return collab[field] || 0;
  }
  return 0;
}

/**
 * Render talent works dual-axis chart
 * @param {Array} collaborations - Array of collaboration objects
 */
function renderTalentWorksChart(collaborations) {
  const ctx = elements.talentWorksChart?.getContext('2d');
  if (!ctx) return;

  // Destroy existing chart
  if (talentWorksChart) {
    talentWorksChart.destroy();
    talentWorksChart = null;
  }

  // 获取当前选择的维度
  const leftAxisKey = elements.talentChartLeftAxis?.value || 'views';
  const rightAxisKey = elements.talentChartRightAxis?.value || '';

  const leftConfig = CHART_AXIS_CONFIG[leftAxisKey];
  const rightConfig = rightAxisKey ? CHART_AXIS_CONFIG[rightAxisKey] : null;

  // Sort collaborations by publish date
  const sortedCollabs = [...collaborations].sort((a, b) => {
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(a.publishDate) - new Date(b.publishDate);
  });

  const labels = sortedCollabs.map(c => {
    const projectName = c.projectName.length > 8
      ? c.projectName.substring(0, 8) + '...'
      : c.projectName;
    return projectName;
  });

  // 获取左轴数据（使用动态字段）
  const leftData = sortedCollabs.map(c => getChartValue(c, leftConfig));

  // 构建 datasets
  const datasets = [{
    label: leftConfig.label,
    data: leftData,
    backgroundColor: leftConfig.color,
    borderColor: leftConfig.color.replace('0.8', '1'),
    borderWidth: 1,
    borderRadius: 4,
    yAxisID: 'y',
    order: 2
  }];

  // 如果有右轴数据（使用动态字段）
  if (rightConfig) {
    const rightData = sortedCollabs.map(c => getChartValue(c, rightConfig));

    datasets.push({
      label: rightConfig.label,
      data: rightData,
      type: 'line',
      borderColor: rightConfig.color,
      backgroundColor: rightConfig.color.replace('1)', '0.1)'),
      borderWidth: 2,
      pointBackgroundColor: rightConfig.color,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: false,
      yAxisID: 'y1',
      order: 1
    });
  }

  // 构建 scales
  const scales = {
    x: {
      grid: { display: false }
    },
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      title: {
        display: true,
        text: leftConfig.label,
        color: leftConfig.color.replace('0.8', '1')
      },
      ticks: {
        callback: function(value) {
          if (leftConfig.format === 'number') {
            if (value >= 100000000) return (value / 100000000).toFixed(1) + '亿';
            if (value >= 10000) return (value / 10000).toFixed(0) + '万';
            return value;
          }
          return value;
        }
      }
    }
  };

  if (rightConfig) {
    scales.y1 = {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      title: {
        display: true,
        text: rightConfig.label,
        color: rightConfig.color
      },
      ticks: {
        callback: function(value) {
          if (rightConfig.format === 'percent') {
            return (value * 100).toFixed(1) + '%';
          }
          if (rightConfig.format === 'currency') {
            return '¥' + value.toFixed(0);
          }
          return value;
        }
      }
    };
  }

  talentWorksChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      onClick: (event, chartElements) => {
        if (chartElements.length > 0) {
          const index = chartElements[0].index;
          const collab = sortedCollabs[index];
          if (collab.platformWorkId) {
            window.open(DOUYIN_VIDEO_URL + collab.platformWorkId, '_blank');
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const index = items[0].dataIndex;
              const collab = sortedCollabs[index];
              return `${collab.projectName} (${collab.publishDate || '未发布'})`;
            },
            label: (context) => {
              const index = context.dataIndex;
              const collab = sortedCollabs[index];
              const datasetLabel = context.dataset.label;
              const value = context.parsed.y;

              // 根据数据类型格式化
              if (datasetLabel === leftConfig.label && leftConfig.format === 'number') {
                return `${datasetLabel}: ${formatLargeNumber(value)}`;
              }
              if (rightConfig && datasetLabel === rightConfig.label) {
                if (rightConfig.format === 'percent') return `${datasetLabel}: ${(value * 100).toFixed(2)}%`;
                if (rightConfig.format === 'currency') return `${datasetLabel}: ¥${value.toFixed(1)}`;
              }
              return `${datasetLabel}: ${value}`;
            },
            afterBody: (items) => {
              const index = items[0].dataIndex;
              const collab = sortedCollabs[index];
              return collab.platformWorkId ? ['', '点击查看视频'] : [];
            }
          }
        },
        legend: {
          display: rightConfig !== null,
          position: 'top',
          labels: { usePointStyle: true, boxWidth: 8 }
        }
      },
      scales
    }
  });
}

/**
 * Render talent works detail table
 * @param {Array} collaborations - Array of collaboration objects
 */
function renderTalentWorksTable(collaborations) {
  if (!elements.talentWorksBody) return;

  // 获取当前数据周期的字段名
  const period = getDataPeriod();
  const viewsField = `${period}_views`;
  const interactionsField = `${period}_interactions`;
  const cpmField = `${period}_cpm`;
  const componentImpressionsField = `${period}_componentImpressions`;
  const componentClicksField = `${period}_componentClicks`;
  const completionRateField = `${period}_completionRate`;

  // Sort by publish date descending
  const sortedCollabs = [...collaborations].sort((a, b) => {
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate) - new Date(a.publishDate);
  });

  elements.talentWorksBody.innerHTML = sortedCollabs.map(collab => {
    // 获取动态字段值
    const views = collab[viewsField] || 0;
    const interactions = collab[interactionsField] || 0;
    const cpm = collab[cpmField] || 0;
    const componentImpressions = collab[componentImpressionsField] || 0;
    const componentClicks = collab[componentClicksField] || 0;
    const completionRate = collab[completionRateField] || 0;

    // 计算组件点击率
    const componentCTR = componentImpressions > 0
      ? componentClicks / componentImpressions
      : 0;

    // 格式化完播率
    const completionRateText = completionRate > 0
      ? `${(completionRate * 100).toFixed(1)}%`
      : '--';
    const completionRateClass = completionRate >= 0.1 ? 'text-green-600 font-medium' :
                                completionRate > 0 ? 'text-gray-700' : 'text-gray-400';

    // 格式化组件点击率
    const componentCTRText = componentCTR > 0
      ? `${(componentCTR * 100).toFixed(2)}%`
      : '--';
    const componentCTRClass = componentCTR >= 0.01 ? 'text-green-600 font-medium' :
                              componentCTR > 0 ? 'text-gray-700' : 'text-gray-400';

    const videoBtn = collab.platformWorkId
      ? `<a href="${DOUYIN_VIDEO_URL}${collab.platformWorkId}" target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
           <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
           </svg>
           播放
         </a>`
      : '<span class="text-gray-400 text-xs">--</span>';

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">${collab.projectName}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">${collab.publishDate || '--'}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-sm text-right text-gray-700">${formatLargeNumber(views)}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-sm text-right ${completionRateClass}">${completionRateText}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-sm text-right ${componentCTRClass}">${componentCTRText}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-sm text-right text-gray-700">${formatLargeNumber(interactions)}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-sm text-right ${cpm > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}">
          ${cpm > 0 ? '¥' + cpm.toFixed(1) : '--'}
        </td>
        <td class="px-3 py-2.5 whitespace-nowrap text-center">${videoBtn}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Destroy talent works chart and close modal
 */
export function destroyTalentWorksChart() {
  closeTalentDetailModal();
}

/**
 * Get current sort selection
 * @returns {string} Current sort field
 */
export function getCurrentTalentSort() {
  return elements.talentSortSelect?.value || 'collaborations';
}

// ========== 筛选相关函数 ==========

/**
 * Initialize talent project selector with projects
 * @param {Array} projects - Array of project objects
 */
export function initTalentProjectSelector(projects) {
  allProjectsForTalent = projects;
  renderTalentProjectOptions(projects);
}

/**
 * Render project options in talent filter dropdown
 * @param {Array} projects - Array of project objects
 */
function renderTalentProjectOptions(projects) {
  if (!elements.talentProjectOptions) return;

  elements.talentProjectOptions.innerHTML = projects.map(p => `
    <label class="dropdown-option">
      <input type="checkbox" value="${p.id}" checked>
      <span>${p.name || p.id}</span>
    </label>
  `).join('');
}

/**
 * Set all talent project checkboxes to a given state
 * @param {boolean} checked - Whether to check or uncheck
 */
function setAllTalentProjectCheckboxes(checked) {
  const checkboxes = elements.talentProjectOptions?.querySelectorAll('input[type="checkbox"]');
  checkboxes?.forEach(cb => {
    cb.checked = checked;
  });
}

/**
 * Filter talent project options by search term
 * @param {string} searchTerm - Search term to filter by
 */
function filterTalentProjectOptions(searchTerm) {
  const options = elements.talentProjectOptions?.querySelectorAll('.dropdown-option');
  const term = searchTerm.toLowerCase();

  options?.forEach(option => {
    const label = option.querySelector('span')?.textContent?.toLowerCase() || '';
    option.style.display = label.includes(term) ? 'flex' : 'none';
  });
}

/**
 * Update talent project selection text display
 */
function updateTalentProjectSelectionText() {
  const checkboxes = elements.talentProjectOptions?.querySelectorAll('input[type="checkbox"]');
  const selectedCount = Array.from(checkboxes || []).filter(cb => cb.checked).length;
  const totalCount = allProjectsForTalent.length;

  if (elements.talentSelectedProjectsText) {
    if (selectedCount === totalCount) {
      elements.talentSelectedProjectsText.textContent = '全部项目';
    } else if (selectedCount === 0) {
      elements.talentSelectedProjectsText.textContent = '未选择项目';
    } else {
      elements.talentSelectedProjectsText.textContent = `已选 ${selectedCount} 个项目`;
    }
  }
}

/**
 * Apply talent filters and re-render
 */
function applyTalentFilters() {
  // 收集选中的项目
  const checkboxes = elements.talentProjectOptions?.querySelectorAll('input[type="checkbox"]');
  const selectedIds = Array.from(checkboxes || [])
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  // 收集达人搜索关键词
  const searchKeyword = elements.talentSearchInput?.value?.trim() || '';

  // 收集合作次数筛选
  const minCollabCount = parseInt(elements.talentCollabCountFilter?.value || '0', 10);

  // 收集CPM区间筛选
  const cpmRange = elements.talentCpmFilter?.value || '';

  // 收集时间范围筛选
  const dateStart = elements.talentDateStart?.value || '';
  const dateEnd = elements.talentDateEnd?.value || '';

  // 更新筛选状态
  talentFilters.selectedProjectIds = selectedIds.length === allProjectsForTalent.length ? [] : selectedIds;
  talentFilters.searchKeyword = searchKeyword;
  talentFilters.minCollabCount = minCollabCount;
  talentFilters.cpmRange = cpmRange;
  talentFilters.dateStart = dateStart;
  talentFilters.dateEnd = dateEnd;

  // 应用筛选并重新渲染
  applyTalentFiltersAndRender();
}

/**
 * Reset talent filters to default state
 */
function resetTalentFilters() {
  // 重置项目选择
  setAllTalentProjectCheckboxes(true);
  updateTalentProjectSelectionText();

  // 重置达人搜索
  if (elements.talentSearchInput) {
    elements.talentSearchInput.value = '';
  }

  // 重置合作次数筛选
  if (elements.talentCollabCountFilter) {
    elements.talentCollabCountFilter.value = '';
  }

  // 重置CPM筛选
  if (elements.talentCpmFilter) {
    elements.talentCpmFilter.value = '';
  }

  // 重置时间范围
  if (elements.talentDateStart) {
    elements.talentDateStart.value = '';
  }
  if (elements.talentDateEnd) {
    elements.talentDateEnd.value = '';
  }

  // 重置筛选状态
  talentFilters.selectedProjectIds = [];
  talentFilters.searchKeyword = '';
  talentFilters.minCollabCount = 0;
  talentFilters.cpmRange = '';
  talentFilters.dateStart = '';
  talentFilters.dateEnd = '';

  // 重新渲染
  applyTalentFiltersAndRender();
}

/**
 * Apply current filters to talent list and re-render
 */
function applyTalentFiltersAndRender() {
  // 从完整列表开始筛选
  let filteredTalents = [...allTalentsList];

  // 项目筛选 - 同时过滤达人的合作记录
  if (talentFilters.selectedProjectIds.length > 0) {
    filteredTalents = filteredTalents
      .map(talent => {
        // 只保留选中项目的合作记录
        const filteredCollaborations = talent.collaborations.filter(collab =>
          talentFilters.selectedProjectIds.includes(collab.projectId)
        );
        if (filteredCollaborations.length === 0) return null;

        // 重新计算该达人的统计数据
        return recalculateTalentStats(talent, filteredCollaborations);
      })
      .filter(Boolean);
  }

  // 时间范围筛选 - 基于发布时间过滤合作记录
  if (talentFilters.dateStart || talentFilters.dateEnd) {
    const startDate = talentFilters.dateStart ? new Date(talentFilters.dateStart) : null;
    const endDate = talentFilters.dateEnd ? new Date(talentFilters.dateEnd + 'T23:59:59') : null;

    filteredTalents = filteredTalents
      .map(talent => {
        const filteredCollaborations = talent.collaborations.filter(collab => {
          if (!collab.publishDate) return false;
          const publishDate = new Date(collab.publishDate);
          if (startDate && publishDate < startDate) return false;
          if (endDate && publishDate > endDate) return false;
          return true;
        });
        if (filteredCollaborations.length === 0) return null;

        return recalculateTalentStats(talent, filteredCollaborations);
      })
      .filter(Boolean);
  }

  // 合作次数筛选
  if (talentFilters.minCollabCount > 0) {
    filteredTalents = filteredTalents.filter(talent =>
      talent.collaborationCount >= talentFilters.minCollabCount
    );
  }

  // CPM区间筛选
  if (talentFilters.cpmRange) {
    filteredTalents = filteredTalents.filter(talent => {
      const cpm = talent.avgCPM;
      if (cpm === 0) return false; // 无CPM数据的不显示

      switch (talentFilters.cpmRange) {
        case '0-10':
          return cpm < 10;
        case '10-20':
          return cpm >= 10 && cpm < 20;
        case '20-50':
          return cpm >= 20 && cpm < 50;
        case '50-':
          return cpm >= 50;
        default:
          return true;
      }
    });
  }

  // 达人名称搜索筛选
  if (talentFilters.searchKeyword) {
    const keyword = talentFilters.searchKeyword.toLowerCase();
    filteredTalents = filteredTalents.filter(talent =>
      talent.talentName.toLowerCase().includes(keyword)
    );
  }

  // 重新计算汇总数据
  const summary = calculateFilteredSummary(filteredTalents);
  renderTalentKpiCards(summary);

  // 按当前排序重新排序
  const sortBy = getCurrentTalentSort();
  const sortedTalents = sortTalents(filteredTalents, sortBy);

  // 渲染表格
  renderTalentRankingTable(sortedTalents);
}

/**
 * Recalculate talent statistics based on filtered collaborations
 * @param {Object} talent - Original talent object
 * @param {Array} filteredCollaborations - Filtered collaboration array
 * @returns {Object} New talent object with recalculated stats
 */
function recalculateTalentStats(talent, filteredCollaborations) {
  // 获取当前数据周期的字段名
  const period = getDataPeriod();
  const viewsField = `${period}_views`;
  const interactionsField = `${period}_interactions`;
  const componentImpressionsField = `${period}_componentImpressions`;
  const componentClicksField = `${period}_componentClicks`;
  const completionViewsField = `${period}_completionViews`;
  const likesField = `${period}_likes`;
  const commentsField = `${period}_comments`;
  const sharesField = `${period}_shares`;

  // 效果统计只计算"视频已发布"状态的合作（与后端 API 保持一致）
  const effectValidCollabs = filteredCollaborations.filter(c => c.isEffectValid);

  const totalViews = effectValidCollabs.reduce((sum, c) => sum + (c[viewsField] || 0), 0);
  const totalInteractions = effectValidCollabs.reduce((sum, c) => sum + (c[interactionsField] || 0), 0);
  const totalExecutionAmount = effectValidCollabs.reduce((sum, c) => sum + (c.executionAmount || 0), 0);
  const totalComponentImpressions = effectValidCollabs.reduce((sum, c) => sum + (c[componentImpressionsField] || 0), 0);
  const totalComponentClicks = effectValidCollabs.reduce((sum, c) => sum + (c[componentClicksField] || 0), 0);
  const totalCompletionViews = effectValidCollabs.reduce((sum, c) => sum + (c[completionViewsField] || 0), 0);
  const totalLikes = effectValidCollabs.reduce((sum, c) => sum + (c[likesField] || 0), 0);
  const totalComments = effectValidCollabs.reduce((sum, c) => sum + (c[commentsField] || 0), 0);
  const totalShares = effectValidCollabs.reduce((sum, c) => sum + (c[sharesField] || 0), 0);

  return {
    ...talent,
    collaborations: filteredCollaborations,
    collaborationCount: filteredCollaborations.length,
    totalViews,
    totalInteractions,
    totalExecutionAmount,
    totalComponentImpressions,
    totalComponentClicks,
    totalCompletionViews,
    totalLikes,
    totalComments,
    totalShares,
    avgCPM: totalViews > 0 ? (totalExecutionAmount / totalViews) * 1000 : 0,
    avgComponentCTR: totalComponentImpressions > 0 ? totalComponentClicks / totalComponentImpressions : 0,
    avgCompletionRate: totalViews > 0 ? totalCompletionViews / totalViews : 0
  };
}

/**
 * Calculate summary for filtered talents
 * @param {Array} talents - Filtered talent array
 * @returns {Object} Summary object
 */
function calculateFilteredSummary(talents) {
  const totalViews = talents.reduce((sum, t) => sum + t.totalViews, 0);
  const totalExecutionAmount = talents.reduce((sum, t) => sum + t.totalExecutionAmount, 0);
  const totalComponentImpressions = talents.reduce((sum, t) => sum + t.totalComponentImpressions, 0);
  const totalComponentClicks = talents.reduce((sum, t) => sum + t.totalComponentClicks, 0);
  const totalCompletionViews = talents.reduce((sum, t) => sum + t.totalCompletionViews, 0);

  return {
    uniqueTalentCount: talents.length,
    totalCollaborations: talents.reduce((sum, t) => sum + t.collaborationCount, 0),
    totalViews,
    totalExecutionAmount,
    avgCPM: totalViews > 0 ? (totalExecutionAmount / totalViews) * 1000 : 0,
    totalComponentImpressions,
    totalComponentClicks,
    avgComponentCTR: totalComponentImpressions > 0 ? totalComponentClicks / totalComponentImpressions : 0,
    avgCompletionRate: totalViews > 0 ? totalCompletionViews / totalViews : 0
  };
}

/**
 * Store all talents for filtering
 * @param {Array} talents - Full talent array
 */
export function setAllTalents(talents) {
  allTalentsList = talents;
}
