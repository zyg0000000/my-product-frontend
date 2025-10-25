/**
 * @file order_list/tab-effect.js
 * @description 效果验收 Tab 模块
 * @version 1.0.0
 *
 * 功能:
 * - 效果看板数据加载
 * - T+21 交付目标达成展示
 * - T+7 业务数据复盘展示
 * - 达人数据明细表格
 * - 互动量/组件点击详情展开收起
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
        this.detailsToggle = {
            interaction: false,    // 互动量明细
            component: false       // 组件点击明细
        };

        // DOM 元素
        this.elements = {
            loading: document.getElementById('effect-dashboard-loading'),
            error: document.getElementById('effect-dashboard-error'),
            content: document.getElementById('effect-dashboard-content'),

            // T+21 数据
            deliveryDate: document.getElementById('eff-delivery-date'),
            progressSummary: document.getElementById('eff-progress-summary'),
            progressBar: document.getElementById('eff-progress-bar'),
            viewsGap: document.getElementById('eff-views-gap'),
            t21Views: document.getElementById('eff-t21-views'),
            t21Cpm: document.getElementById('eff-t21-cpm'),
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
            talentListBody: document.getElementById('effect-talent-list-body')
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
            benchmarkCpm,
            targetViews
        } = this.elements;

        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // 交付日期
        if (deliveryDate) {
            deliveryDate.textContent = `[${overall.deliveryDate || 'N/A'}]`;
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

            // 进度摘要
            if (progressSummary) {
                progressSummary.innerHTML = `当前 <span class="font-bold">${currentViews.toLocaleString()}</span> / 目标 <span class="font-bold">${(targetViewsValue || 0).toLocaleString()}</span>`;
            }

            // 进度条
            const progress = (targetViewsValue && targetViewsValue > 0) ? (currentViews / targetViewsValue) * 100 : 0;
            const progressPercent = Math.min(progress, 100).toFixed(0);
            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
                progressBar.textContent = `${progressPercent}%`;
            }

            // GAP
            const gap = overall.viewsGap;
            if (viewsGap) {
                viewsGap.innerHTML = `GAP: <span class="font-bold ${gap >= 0 ? 'text-green-600' : 'text-red-600'}">${Number(gap || 0).toLocaleString()}</span>`;
            }

            // T+21 播放量和CPM
            if (t21Views) t21Views.innerHTML = `[${formatNumber(currentViews)}]`;
            if (t21Cpm) t21Cpm.innerHTML = formatCurrency(overall.t21_cpm);
            if (targetViews) targetViews.innerHTML = `[${formatNumber(targetViewsValue)}]`;
        } else {
            // 数据未录入时的显示
            if (progressSummary) progressSummary.innerHTML = `当前 ${notEnteredSpan} / 目标 ${notEnteredSpan}`;
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.textContent = '0%';
            }
            if (viewsGap) viewsGap.innerHTML = `GAP: ${notEnteredSpan}`;
            if (t21Views) t21Views.innerHTML = `[${notEnteredSpan}]`;
            if (t21Cpm) t21Cpm.innerHTML = notEnteredSpan;
            if (targetViews) targetViews.innerHTML = `[${notEnteredSpan}]`;
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
                t7ReviewDate.textContent = reviewDate.toLocaleDateString();
            } else {
                t7ReviewDate.textContent = 'N/A';
            }
        }

        // T+7 各项指标
        if (t7Views) t7Views.innerHTML = `[${formatNumber(overall.t7_totalViews)}]`;
        if (t7Interactions) t7Interactions.innerHTML = `[${formatNumber(overall.t7_totalInteractions)}]`;
        if (t7Cpm) t7Cpm.innerHTML = formatCurrency(overall.t7_cpm);
        if (t7Cpe) t7Cpe.innerHTML = formatCurrency(overall.t7_cpe);
        if (t7Ctr) t7Ctr.innerHTML = formatPercent(overall.t7_ctr);
    }

    /**
     * 渲染达人明细表格
     */
    renderTalentDetails(talents) {
        const { talentListBody } = this.elements;
        if (!talentListBody) return;

        talentListBody.innerHTML = '';

        if (talents.length === 0) {
            talentListBody.innerHTML = '<tr><td colspan="12" class="text-center py-8 text-gray-500">暂无达人效果数据</td></tr>';
            return;
        }

        const notEnteredSpan = `<span class="text-sm text-gray-400">暂未录入</span>`;
        const formatNumber = (num) => (num === null || num === undefined) ? notEnteredSpan : Number(num).toLocaleString();
        const formatCurrency = (num) => (num === null || num === undefined) ? notEnteredSpan : `¥${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatPercent = (num) => (num === null || num === undefined) ? notEnteredSpan : `${(Number(num) * 100).toFixed(2)}%`;
        const formatDate = (dateStr) => (dateStr) ? new Date(dateStr).toLocaleDateString() : 'N/A';

        talents.forEach(talent => {
            // 主行
            const mainRow = document.createElement('tr');
            mainRow.className = 'bg-white border-b hover:bg-gray-50/50';
            mainRow.innerHTML = `
                <td class="px-4 py-4 font-medium text-gray-900">${talent.talentName}</td>
                <td class="px-4 py-4">${formatCurrency(talent.executionAmount)}</td>
                <td class="px-4 py-4">${formatDate(talent.publishDate)}</td>
                <td class="px-4 py-3 font-medium border-l">${formatNumber(talent.t21_views)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t21_cpm)}</td>
                <td class="px-4 py-3 font-medium border-l">${formatNumber(talent.t7_views)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_interactions)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpm)}</td>
                <td class="px-4 py-3 font-medium">${formatCurrency(talent.t7_cpe)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_ctr)}</td>
                <td class="px-4 py-3 font-medium">${formatPercent(talent.t7_completionRate)}</td>
                <td class="px-4 py-3 font-medium">${formatNumber(talent.t7_totalReach)}</td>
            `;

            // 互动量明细行
            const interactionDetailRow = document.createElement('tr');
            interactionDetailRow.className = 'detail-row interaction-detail-row bg-gray-100';
            interactionDetailRow.innerHTML = `
                <td colspan="12" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-5 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">点赞量:</span> ${formatNumber(talent.t7_likes)}</div>
                        <div><span class="font-semibold text-gray-500">评论量:</span> ${formatNumber(talent.t7_comments)}</div>
                        <div><span class="font-semibold text-gray-500">分享量:</span> ${formatNumber(talent.t7_shares)}</div>
                        <div><span class="font-semibold text-gray-500">互动率:</span> ${formatPercent(talent.t7_interactionRate)}</div>
                        <div><span class="font-semibold text-gray-500">赞播比:</span> ${formatPercent(talent.t7_likeToViewRatio)}</div>
                    </div>
                </td>
            `;

            // 组件点击明细行
            const componentDetailRow = document.createElement('tr');
            componentDetailRow.className = 'detail-row component-detail-row bg-gray-100';
            componentDetailRow.innerHTML = `
                <td colspan="12" class="px-6 py-3 text-xs">
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div><span class="font-semibold text-gray-500">组件展示量:</span> ${formatNumber(talent.t7_componentImpressions)}</div>
                        <div><span class="font-semibold text-gray-500">组件点击量:</span> ${formatNumber(talent.t7_componentClicks)}</div>
                    </div>
                </td>
            `;

            talentListBody.appendChild(mainRow);
            talentListBody.appendChild(interactionDetailRow);
            talentListBody.appendChild(componentDetailRow);
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
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
     * 展开/收起详情
     */
    handleToggleDetails(target) {
        this.detailsToggle[target] = !this.detailsToggle[target];

        const rowClass = target === 'interaction' ? '.interaction-detail-row' : '.component-detail-row';
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
}

export default EffectTab;
