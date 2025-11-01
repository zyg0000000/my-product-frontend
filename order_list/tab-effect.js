/**
 * @file order_list/tab-effect.js
 * @description 效果验收 Tab 模块
 * @version 2.3.1 - 修复T+7表格缺少总互动量列
 *
 * 功能:
 * - 效果看板数据加载
 * - T+21/T+7 子Tab切换
 * - T+21 交付目标达成展示（进度条动画、颜色分级、CPM达标状态）
 * - T+7 业务数据复盘展示（横向KPI卡片）
 * - T+21达人明细：支持下拉展开查看互动量和组件明细
 * - T+7达人明细：直接显示所有字段（17列），无下拉
 *
 * 表格设计:
 * - T+21: 10列 + 2个下拉明细行（互动量明细、组件明细）
 * - T+7: 17列全展开（达人名称、执行金额、发布时间、播放量、总互动量、点赞量、评论量、分享量、
 *        互动率、赞播比、CPM、CPE、组件展示量、组件点击量、组件点击率、视频完播率、总触达人数）
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
        this.detailsToggle = {
            't21-interaction': false,    // T+21 互动量明细
            't21-component': false       // T+21 组件明细
            // T+7 不需要toggle，直接全展开
        };

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
            talentListT7: document.getElementById('effect-talent-list-t7')
        };
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
     * 渲染达人明细表格（支持展开明细行）
     */
    renderTalentDetails(talents) {
        const { talentListT21, talentListT7 } = this.elements;

        if (!talentListT21 || !talentListT7) return;

        // 清空表格
        talentListT21.innerHTML = '';
        talentListT7.innerHTML = '';

        if (talents.length === 0) {
            talentListT21.innerHTML = '<tr><td colspan="10" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>';
            talentListT7.innerHTML = '<tr><td colspan="17" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>';
            return;
        }

        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;
        const formatDate = (dateStr) => (dateStr) ? new Date(dateStr).toLocaleDateString() : 'N/A';

        // 获取目标CPM用于达标判断
        const targetCpm = this.effectData?.overall?.benchmarkCPM;

        talents.forEach(talent => {
            // ===== T+21 主行 =====
            const t21Row = document.createElement('tr');
            t21Row.className = 'bg-white border-b hover:bg-gray-50/50';

            // CPM达标状态判断
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

            // ===== T+7 主行（直接显示所有字段，不使用明细行）=====
            const t7MainRow = document.createElement('tr');
            t7MainRow.className = 'bg-white border-b hover:bg-gray-50/50';
            t7MainRow.innerHTML = `
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
            talentListT7.appendChild(t7MainRow);
        });
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

        // 详情展开/收起按钮
        const detailsToggleBtns = document.querySelectorAll('.details-toggle-btn');
        detailsToggleBtns.forEach(btn => {
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
        this.detailsToggle[target] = !this.detailsToggle[target];

        const rowClass = `.${target}-detail-row`;
        const rows = document.querySelectorAll(rowClass);
        const btn = document.querySelector(`.details-toggle-btn[data-target="${target}"]`);
        const icon = btn?.querySelector('.details-toggle-icon');

        if (this.detailsToggle[target]) {
            // 展开
            rows.forEach(row => row.style.display = 'table-row');
            if (icon) icon.classList.add('rotated');
        } else {
            // 收起
            rows.forEach(row => row.style.display = 'none');
            if (icon) icon.classList.remove('rotated');
        }
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
