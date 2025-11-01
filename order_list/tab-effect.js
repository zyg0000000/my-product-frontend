/**
 * @file order_list/tab-effect.js
 * @description 效果验收 Tab 模块
 * @version 3.2.0 - 紧凑模式改为下拉箭头折叠设计（类似main分支）
 *
 * 功能:
 * - 效果看板数据加载
 * - T+21/T+7 子Tab切换
 * - T+21 交付目标达成展示（进度条动画、颜色分级、CPM达标状态）
 * - T+7 业务数据复盘展示（横向KPI卡片）
 * - 达人明细表格：支持手动切换全展开/紧凑模式 + localStorage持久化
 * - 智能响应式：用户未手动选择时自动根据屏幕宽度切换
 *
 * 表格设计:
 * - 全展开模式（17列）：
 *   所有字段直接显示，无需展开
 *
 * - 紧凑模式（10列 + 下拉箭头）：
 *   主行：达人名称、执行金额、发布时间、播放量、总互动量▼、CPM、CPE、组件点击率▼、视频完播率、总触达人数
 *   明细行1（点击总互动量展开）：点赞量、评论量、分享量、互动率、赞播比
 *   明细行2（点击组件点击率展开）：组件展示量、组件点击量
 *
 * 优先级：用户手动选择 > 自动响应式判断
 */

import { AppCore } from '../common/app-core.js';

const { API, Modal, Format } = AppCore;

const PERFORMANCE_API_ENDPOINT = '/project-performance';

export class EffectTab {
    constructor(projectId, project) {
        this.projectId = projectId;
        this.project = project;

        // 数据
        this.effectData = null;

        // 状态
        this.currentSubTab = 't21'; // 当前子Tab: t21 或 t7
        this.userPreferredMode = this.loadUserPreference(); // 用户手动选择的模式: 'full' | 'compact' | null
        this.isCompactMode = this.determineCompactMode(); // 当前是否使用紧凑模式

        // DOM 元素
        this.elements = {
            loading: document.getElementById('effect-dashboard-loading'),
            error: document.getElementById('effect-dashboard-error'),
            content: document.getElementById('effect-dashboard-content'),

            // 子Tab切换按钮
            subTabBtns: document.querySelectorAll('.effect-sub-tab'),
            t21Content: document.getElementById('effect-t21-content'),
            t7Content: document.getElementById('effect-t7-content'),

            // T+21 数据
            deliveryDate: document.getElementById('eff-delivery-date'),
            progressSummary: document.getElementById('eff-progress-summary'),
            progressBar: document.getElementById('eff-progress-bar'),
            viewsGap: document.getElementById('eff-views-gap'),
            t21Views: document.getElementById('eff-t21-views'),
            t21Cpm: document.getElementById('eff-t21-cpm'),
            t21CpmCard: document.getElementById('eff-t21-cpm-card'),
            benchmarkCpm: document.getElementById('eff-benchmark-cpm'),
            targetViews: document.getElementById('eff-target-views'),

            // T+7 数据
            t7ReviewDate: document.getElementById('eff-t7-review-date'),
            t7Views: document.getElementById('eff-t7-views'),
            t7Interactions: document.getElementById('eff-t7-interactions'),
            t7Cpm: document.getElementById('eff-t7-cpm'),
            t7Cpe: document.getElementById('eff-t7-cpe'),
            t7Ctr: document.getElementById('eff-t7-ctr'),

            // 达人明细
            talentListT21: document.getElementById('effect-talent-list-t21'),
            talentListT7: document.getElementById('effect-talent-list-t7'),

            // 视图模式切换按钮
            t21ViewFullBtn: document.getElementById('t21-view-full-btn'),
            t21ViewCompactBtn: document.getElementById('t21-view-compact-btn'),
            t7ViewFullBtn: document.getElementById('t7-view-full-btn'),
            t7ViewCompactBtn: document.getElementById('t7-view-compact-btn')
        };

        // 绑定窗口resize事件，实现响应式切换
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // 初始化视图模式按钮状态
        this.updateViewModeButtons();
    }

    /**
     * 从localStorage加载用户偏好
     */
    loadUserPreference() {
        try {
            return localStorage.getItem('effectTableViewMode'); // 'full' | 'compact' | null
        } catch (e) {
            return null;
        }
    }

    /**
     * 保存用户偏好到localStorage
     */
    saveUserPreference(mode) {
        try {
            if (mode) {
                localStorage.setItem('effectTableViewMode', mode);
            } else {
                localStorage.removeItem('effectTableViewMode');
            }
        } catch (e) {
            console.error('Failed to save view mode preference:', e);
        }
    }

    /**
     * 确定当前是否使用紧凑模式
     * 优先级：用户手动选择 > 自动响应式判断
     */
    determineCompactMode() {
        if (this.userPreferredMode === 'full') {
            return false;
        } else if (this.userPreferredMode === 'compact') {
            return true;
        } else {
            // 自动判断：屏幕宽度 < 1440px 使用紧凑模式
            return window.innerWidth < 1440;
        }
    }

    /**
     * 更新视图模式按钮状态
     */
    updateViewModeButtons() {
        const { t21ViewFullBtn, t21ViewCompactBtn, t7ViewFullBtn, t7ViewCompactBtn } = this.elements;

        if (this.isCompactMode) {
            t21ViewFullBtn?.classList.remove('active');
            t21ViewCompactBtn?.classList.add('active');
            t7ViewFullBtn?.classList.remove('active');
            t7ViewCompactBtn?.classList.add('active');
        } else {
            t21ViewFullBtn?.classList.add('active');
            t21ViewCompactBtn?.classList.remove('active');
            t7ViewFullBtn?.classList.add('active');
            t7ViewCompactBtn?.classList.remove('active');
        }
    }

    /**
     * 处理窗口resize事件
     * 仅在用户未手动选择模式时自动响应屏幕宽度变化
     */
    handleResize() {
        // 如果用户已手动选择模式，则不自动响应resize
        if (this.userPreferredMode) {
            return;
        }

        const newMode = window.innerWidth < 1440;
        if (newMode !== this.isCompactMode) {
            this.isCompactMode = newMode;
            this.updateViewModeButtons();
            // 如果已加载数据，重新渲染表格
            if (this.effectData) {
                this.renderTalentDetails(this.effectData.talents || []);
            }
        }
    }

    /**
     * 手动切换视图模式
     */
    switchViewMode(mode) {
        this.userPreferredMode = mode;
        this.isCompactMode = (mode === 'compact');

        // 保存用户偏好
        this.saveUserPreference(mode);

        // 更新按钮状态
        this.updateViewModeButtons();

        // 重新渲染表格
        if (this.effectData) {
            this.renderTalentDetails(this.effectData.talents || []);
        }
    }

    /**
     * 加载数据
     */
    async load() {
        // 如果已经加载过数据，直接渲染
        if (this.effectData) {
            this.render();
            return;
        }

        this.showLoading();

        try {
            const response = await API.request(PERFORMANCE_API_ENDPOINT, 'POST', {
                projectId: this.projectId
            });

            this.effectData = response;
            this.render();
        } catch (error) {
            console.error('加载效果看板数据失败:', error);
            this.showError();
        }
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        const { loading, error, content } = this.elements;
        if (loading) loading.classList.remove('hidden');
        if (error) error.classList.add('hidden');
        if (content) content.classList.add('hidden');
    }

    /**
     * 显示错误状态
     */
    showError() {
        const { loading, error, content } = this.elements;
        if (loading) loading.classList.add('hidden');
        if (error) error.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }

    /**
     * 渲染看板
     */
    render() {
        const { loading, content } = this.elements;
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');

        const { overall = {}, talents = [] } = this.effectData;

        // 渲染 T+21 数据
        this.renderT21Data(overall);

        // 渲染 T+7 数据
        this.renderT7Data(overall, talents);

        // 渲染达人明细
        this.renderTalentDetails(talents);

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 格式化日期为 YYYY-MM-DD 格式
     */
    formatDateYMD(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 渲染 T+21 数据
     */
    renderT21Data(overall) {
        const {
            deliveryDate,
            progressSummary,
            progressBar,
            viewsGap,
            t21Views,
            t21Cpm,
            t21CpmCard,
            benchmarkCpm,
            targetViews
        } = this.elements;

        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // 交付日期
        if (deliveryDate) {
            deliveryDate.textContent = this.formatDateYMD(overall.deliveryDate);
        }

        // 目标CPM
        if (benchmarkCpm) {
            benchmarkCpm.innerHTML = formatCurrency(overall.benchmarkCPM);
        }

        // 检查是否有 T+21 数据
        const isT21DataAvailable = overall.t21_totalViews !== null && overall.t21_totalViews !== undefined;

        if (isT21DataAvailable) {
            const currentViews = overall.t21_totalViews;
            const targetViewsValue = overall.targetViews;
            const currentCpm = overall.t21_cpm;
            const targetCpm = overall.benchmarkCPM;

            // 进度摘要
            if (progressSummary) {
                progressSummary.innerHTML = `当前 <span class="font-bold">${currentViews.toLocaleString()}</span> / 目标 <span class="font-bold">${(targetViewsValue || 0).toLocaleString()}</span>`;
            }

            // 进度条 + 颜色分级 + 动画
            const progress = (targetViewsValue && targetViewsValue > 0) ? (currentViews / targetViewsValue) * 100 : 0;
            const progressPercent = Math.min(progress, 100).toFixed(0);

            if (progressBar) {
                // 清除旧的颜色类
                progressBar.classList.remove('progress-excellent', 'progress-good', 'progress-warning', 'progress-danger');

                // 根据达成率设置颜色
                if (progress >= 100) {
                    progressBar.classList.add('progress-excellent');
                } else if (progress >= 80) {
                    progressBar.classList.add('progress-good');
                } else if (progress >= 60) {
                    progressBar.classList.add('progress-warning');
                } else {
                    progressBar.classList.add('progress-danger');
                }

                // 动画效果：延迟执行让动画可见
                setTimeout(() => {
                    progressBar.style.width = `${progressPercent}%`;
                    progressBar.textContent = `${progressPercent}%`;
                }, 100);
            }

            // GAP
            const gap = overall.viewsGap;
            if (viewsGap) {
                viewsGap.innerHTML = `GAP: <span class="font-bold ${gap >= 0 ? 'text-green-600' : 'text-red-600'}">${Number(gap || 0).toLocaleString()}</span>`;
            }

            // T+21 播放量和CPM
            if (t21Views) t21Views.innerHTML = formatNumber(currentViews);
            if (t21Cpm) t21Cpm.innerHTML = formatCurrency(currentCpm);
            if (targetViews) targetViews.innerHTML = formatNumber(targetViewsValue);

            // CPM达标状态卡片高亮
            if (t21CpmCard && currentCpm !== null && currentCpm !== undefined && targetCpm !== null && targetCpm !== undefined) {
                t21CpmCard.classList.remove('kpi-达标', 'kpi-未达标');
                if (currentCpm <= targetCpm) {
                    t21CpmCard.classList.add('kpi-达标');
                } else {
                    t21CpmCard.classList.add('kpi-未达标');
                }
            }
        } else {
            // 数据未录入时的显示
            if (progressSummary) progressSummary.innerHTML = `当前 ${notEnteredSpan} / 目标 ${notEnteredSpan}`;
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.textContent = '0%';
            }
            if (viewsGap) viewsGap.innerHTML = `GAP: ${notEnteredSpan}`;
            if (t21Views) t21Views.innerHTML = notEnteredSpan;
            if (t21Cpm) t21Cpm.innerHTML = notEnteredSpan;
            if (targetViews) targetViews.innerHTML = notEnteredSpan;
        }
    }

    /**
     * 渲染 T+7 数据
     */
    renderT7Data(overall, talents) {
        const {
            t7ReviewDate,
            t7Views,
            t7Interactions,
            t7Cpm,
            t7Cpe,
            t7Ctr
        } = this.elements;

        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;

        // 计算 T+7 复盘日期 (最后发布日期 + 7天)
        if (t7ReviewDate) {
            const lastPublishDate = talents
                .filter(t => t.publishDate)
                .map(t => new Date(t.publishDate))
                .sort((a, b) => b - a)[0];

            if (lastPublishDate) {
                const reviewDate = new Date(lastPublishDate);
                reviewDate.setDate(reviewDate.getDate() + 7);
                t7ReviewDate.textContent = this.formatDateYMD(reviewDate);
            } else {
                t7ReviewDate.textContent = 'N/A';
            }
        }

        // T+7 各项指标
        if (t7Views) t7Views.innerHTML = formatNumber(overall.t7_totalViews);
        if (t7Interactions) t7Interactions.innerHTML = formatNumber(overall.t7_totalInteractions);
        if (t7Cpm) t7Cpm.innerHTML = formatCurrency(overall.t7_cpm);
        if (t7Cpe) t7Cpe.innerHTML = formatCurrency(overall.t7_cpe);
        if (t7Ctr) t7Ctr.innerHTML = formatPercent(overall.t7_ctr);
    }

    /**
     * 渲染达人明细表格（支持响应式：大屏全展开17列，小屏折叠10列+明细行）
     */
    renderTalentDetails(talents) {
        const { talentListT21, talentListT7 } = this.elements;

        if (!talentListT21 || !talentListT7) return;

        // 更新表头
        this.updateTableHeaders();

        // 清空表格
        talentListT21.innerHTML = '';
        talentListT7.innerHTML = '';

        if (talents.length === 0) {
            const colspan = this.isCompactMode ? '10' : '17';
            talentListT21.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>`;
            talentListT7.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>`;
            return;
        }

        // 根据屏幕模式选择渲染方式
        if (this.isCompactMode) {
            this.renderCompactMode(talents, talentListT21, talentListT7);
        } else {
            this.renderFullMode(talents, talentListT21, talentListT7);
        }
    }

    /**
     * 更新表头（根据当前模式）
     */
    updateTableHeaders() {
        // 查找T+21和T+7表格的thead
        const t21Table = document.querySelector('#effect-talent-list-t21')?.closest('table');
        const t7Table = document.querySelector('#effect-talent-list-t7')?.closest('table');

        if (!t21Table || !t7Table) return;

        const t21Thead = t21Table.querySelector('thead tr');
        const t7Thead = t7Table.querySelector('thead tr');

        if (!t21Thead || !t7Thead) return;

        if (this.isCompactMode) {
            // 紧凑模式：10列 + 下拉箭头
            const compactHeaderHTML = `
                <th scope="col" class="px-4 py-3">达人名称</th>
                <th scope="col" class="px-4 py-3">执行金额</th>
                <th scope="col" class="px-4 py-3">发布时间</th>
                <th scope="col" class="px-4 py-3">播放量</th>
                <th scope="col" class="px-4 py-3">
                    <div class="flex items-center justify-center cursor-pointer details-toggle-btn" data-target="t21-interaction">
                        <span>总互动量</span>
                        <svg class="w-4 h-4 ml-1 details-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </th>
                <th scope="col" class="px-4 py-3">CPM</th>
                <th scope="col" class="px-4 py-3">CPE</th>
                <th scope="col" class="px-4 py-3">
                    <div class="flex items-center justify-center cursor-pointer details-toggle-btn" data-target="t21-component">
                        <span>组件点击率</span>
                        <svg class="w-4 h-4 ml-1 details-toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </th>
                <th scope="col" class="px-4 py-3">视频完播率</th>
                <th scope="col" class="px-4 py-3">总触达人数</th>
            `;

            const t7CompactHeaderHTML = compactHeaderHTML.replace(/t21-/g, 't7-');

            t21Thead.innerHTML = compactHeaderHTML;
            t7Thead.innerHTML = t7CompactHeaderHTML;
        } else {
            // 全展开模式：17列
            const fullHeaderHTML = `
                <th scope="col" class="px-4 py-3">达人名称</th>
                <th scope="col" class="px-4 py-3">执行金额</th>
                <th scope="col" class="px-4 py-3">发布时间</th>
                <th scope="col" class="px-4 py-3">播放量</th>
                <th scope="col" class="px-4 py-3">总互动量</th>
                <th scope="col" class="px-4 py-3 hide-compact">点赞量</th>
                <th scope="col" class="px-4 py-3 hide-compact">评论量</th>
                <th scope="col" class="px-4 py-3 hide-compact">分享量</th>
                <th scope="col" class="px-4 py-3 hide-compact">互动率</th>
                <th scope="col" class="px-4 py-3 hide-compact">赞播比</th>
                <th scope="col" class="px-4 py-3">CPM</th>
                <th scope="col" class="px-4 py-3">CPE</th>
                <th scope="col" class="px-4 py-3 hide-compact">组件展示量</th>
                <th scope="col" class="px-4 py-3 hide-compact">组件点击量</th>
                <th scope="col" class="px-4 py-3">组件点击率</th>
                <th scope="col" class="px-4 py-3">视频完播率</th>
                <th scope="col" class="px-4 py-3">总触达人数</th>
            `;

            t21Thead.innerHTML = fullHeaderHTML;
            t7Thead.innerHTML = fullHeaderHTML;
        }
    }

    /**
     * 渲染全展开模式（大屏>=1440px）
     */
    renderFullMode(talents, talentListT21, talentListT7) {
        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;
        const formatDate = (dateStr) => (dateStr) ? this.formatDateYMD(dateStr) : 'N/A';

        const targetCpm = this.effectData?.overall?.benchmarkCPM;

        talents.forEach(talent => {
            // ===== T+21 主行（17列全展开）=====
            const t21Row = document.createElement('tr');
            t21Row.className = 'bg-white border-b hover:bg-gray-50/50';

            let cpmClass = '';
            if (talent.t21_cpm !== null && talent.t21_cpm !== undefined && targetCpm !== null && targetCpm !== undefined) {
                cpmClass = talent.t21_cpm <= targetCpm ? 'cpm-达标' : 'cpm-未达标';
            }

            t21Row.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td>
                <td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td>
                <td class="px-4 py-4">${formatDate(talent.publishDate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_views)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_interactions)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_likes)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_comments)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_shares)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_interactionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_likeToViewRatio)}</td>
                <td class="px-4 py-3 font-medium ${cpmClass}">${formatCurrency(talent.t21_cpm)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t21_cpe)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_componentImpressions)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_componentClicks)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_ctr)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_completionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_totalReach)}</td>
            `;
            talentListT21.appendChild(t21Row);

            // ===== T+7 主行（17列全展开）=====
            const t7Row = document.createElement('tr');
            t7Row.className = 'bg-white border-b hover:bg-gray-50/50';
            t7Row.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td>
                <td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td>
                <td class="px-4 py-4">${formatDate(talent.publishDate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_views)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_interactions)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_likes)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_comments)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_shares)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_interactionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_likeToViewRatio)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpm)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpe)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_componentImpressions)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_componentClicks)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_ctr)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_completionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_totalReach)}</td>
            `;
            talentListT7.appendChild(t7Row);
        });
    }

    /**
     * 渲染紧凑模式 - 10列主行 + 下拉箭头展开明细行
     */
    renderCompactMode(talents, talentListT21, talentListT7) {
        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;
        const formatDate = (dateStr) => (dateStr) ? this.formatDateYMD(dateStr) : 'N/A';

        const targetCpm = this.effectData?.overall?.benchmarkCPM;

        talents.forEach((talent, index) => {
            // ===== T+21 紧凑模式（10列 + 明细行）=====
            const t21Row = document.createElement('tr');
            t21Row.className = 'bg-white border-b hover:bg-gray-50/50';

            let cpmClass = '';
            if (talent.t21_cpm !== null && talent.t21_cpm !== undefined && targetCpm !== null && targetCpm !== undefined) {
                cpmClass = talent.t21_cpm <= targetCpm ? 'cpm-达标' : 'cpm-未达标';
            }

            t21Row.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td>
                <td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td>
                <td class="px-4 py-4">${formatDate(talent.publishDate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_views)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_interactions)}</td>
                <td class="px-4 py-3 font-medium ${cpmClass}">${formatCurrency(talent.t21_cpm)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t21_cpe)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_ctr)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t21_completionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t21_totalReach)}</td>
            `;
            talentListT21.appendChild(t21Row);

            // T+21 互动量明细行
            const t21InteractionRow = document.createElement('tr');
            t21InteractionRow.className = 'detail-row t21-interaction-detail-row bg-gray-100';
            t21InteractionRow.style.display = 'none';
            t21InteractionRow.innerHTML = `
                <td colspan="10" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-5 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">点赞量:</span> ${formatNumber(talent.t21_likes)}</div>
                        <div><span class="font-semibold text-gray-500">评论量:</span> ${formatNumber(talent.t21_comments)}</div>
                        <div><span class="font-semibold text-gray-500">分享量:</span> ${formatNumber(talent.t21_shares)}</div>
                        <div><span class="font-semibold text-gray-500">互动率:</span> ${formatPercent(talent.t21_interactionRate)}</div>
                        <div><span class="font-semibold text-gray-500">赞播比:</span> ${formatPercent(talent.t21_likeToViewRatio)}</div>
                    </div>
                </td>
            `;
            talentListT21.appendChild(t21InteractionRow);

            // T+21 组件明细行
            const t21ComponentRow = document.createElement('tr');
            t21ComponentRow.className = 'detail-row t21-component-detail-row bg-gray-100';
            t21ComponentRow.style.display = 'none';
            t21ComponentRow.innerHTML = `
                <td colspan="10" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">组件展示量:</span> ${formatNumber(talent.t21_componentImpressions)}</div>
                        <div><span class="font-semibold text-gray-500">组件点击量:</span> ${formatNumber(talent.t21_componentClicks)}</div>
                    </div>
                </td>
            `;
            talentListT21.appendChild(t21ComponentRow);

            // ===== T+7 紧凑模式（10列 + 明细行）=====
            const t7Row = document.createElement('tr');
            t7Row.className = 'bg-white border-b hover:bg-gray-50/50';
            t7Row.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td>
                <td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td>
                <td class="px-4 py-4">${formatDate(talent.publishDate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_views)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_interactions)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpm)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpe)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_ctr)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_completionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_totalReach)}</td>
            `;
            talentListT7.appendChild(t7Row);

            // T+7 互动量明细行
            const t7InteractionRow = document.createElement('tr');
            t7InteractionRow.className = 'detail-row t7-interaction-detail-row bg-gray-100';
            t7InteractionRow.style.display = 'none';
            t7InteractionRow.innerHTML = `
                <td colspan="10" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-5 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">点赞量:</span> ${formatNumber(talent.t7_likes)}</div>
                        <div><span class="font-semibold text-gray-500">评论量:</span> ${formatNumber(talent.t7_comments)}</div>
                        <div><span class="font-semibold text-gray-500">分享量:</span> ${formatNumber(talent.t7_shares)}</div>
                        <div><span class="font-semibold text-gray-500">互动率:</span> ${formatPercent(talent.t7_interactionRate)}</div>
                        <div><span class="font-semibold text-gray-500">赞播比:</span> ${formatPercent(talent.t7_likeToViewRatio)}</div>
                    </div>
                </td>
            `;
            talentListT7.appendChild(t7InteractionRow);

            // T+7 组件明细行
            const t7ComponentRow = document.createElement('tr');
            t7ComponentRow.className = 'detail-row t7-component-detail-row bg-gray-100';
            t7ComponentRow.style.display = 'none';
            t7ComponentRow.innerHTML = `
                <td colspan="10" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">组件展示量:</span> ${formatNumber(talent.t7_componentImpressions)}</div>
                        <div><span class="font-semibold text-gray-500">组件点击量:</span> ${formatNumber(talent.t7_componentClicks)}</div>
                    </div>
                </td>
            `;
            talentListT7.appendChild(t7ComponentRow);
        });

        // 绑定下拉箭头点击事件
        this.bindDetailToggleEvents();
    }

    /**
     * 绑定明细行展开/收起事件
     */
    bindDetailToggleEvents() {
        const detailsToggleBtns = document.querySelectorAll('.details-toggle-btn');
        detailsToggleBtns.forEach(btn => {
            // 移除旧的事件监听器（如果有）
            btn.replaceWith(btn.cloneNode(true));
        });

        // 重新获取元素并绑定
        const newToggleBtns = document.querySelectorAll('.details-toggle-btn');
        newToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                this.handleToggleDetails(target);
            });
        });
    }

    /**
     * 展开/收起详情行
     */
    handleToggleDetails(target) {
        const rowClass = `.${target}-detail-row`;
        const rows = document.querySelectorAll(rowClass);
        const btn = document.querySelector(`.details-toggle-btn[data-target="${target}"]`);
        const icon = btn?.querySelector('.details-toggle-icon');

        // 切换显示状态
        const isCurrentlyHidden = rows[0]?.style.display === 'none';

        rows.forEach(row => {
            row.style.display = isCurrentlyHidden ? 'table-row' : 'none';
        });

        if (icon) {
            if (isCurrentlyHidden) {
                icon.classList.add('rotated');
            } else {
                icon.classList.remove('rotated');
            }
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 子Tab切换
        this.elements.subTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.effectTab;
                this.switchSubTab(tab);
            });
        });

        // 视图模式切换按钮
        const { t21ViewFullBtn, t21ViewCompactBtn, t7ViewFullBtn, t7ViewCompactBtn } = this.elements;

        t21ViewFullBtn?.addEventListener('click', () => this.switchViewMode('full'));
        t21ViewCompactBtn?.addEventListener('click', () => this.switchViewMode('compact'));
        t7ViewFullBtn?.addEventListener('click', () => this.switchViewMode('full'));
        t7ViewCompactBtn?.addEventListener('click', () => this.switchViewMode('compact'));
    }

    /**
     * 切换子Tab
     */
    switchSubTab(tab) {
        if (this.currentSubTab === tab) return;

        this.currentSubTab = tab;

        // 更新按钮状态
        this.elements.subTabBtns.forEach(btn => {
            if (btn.dataset.effectTab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 切换内容显示
        if (tab === 't21') {
            this.elements.t21Content?.classList.remove('hidden');
            this.elements.t7Content?.classList.add('hidden');
        } else {
            this.elements.t21Content?.classList.add('hidden');
            this.elements.t7Content?.classList.remove('hidden');
        }
    }
}

export default EffectTab;
