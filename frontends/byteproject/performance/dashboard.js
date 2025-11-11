/**
 * dashboard.js - 仪表板统计模块
 * 负责渲染统计卡片和分布图表
 */

import { totalTalents } from './state-manager.js';

/**
 * 渲染仪表板统计信息
 * @param {Object} dashboardStats - 统计数据
 */
export function renderDashboard(dashboardStats) {
    const elements = {
        total: document.getElementById('stat-total-talents'),
        tier: document.getElementById('stat-tier-distribution'),
        cpm: document.getElementById('stat-cpm-distribution'),
        male: document.getElementById('stat-male-audience-distribution'),
        female: document.getElementById('stat-female-audience-distribution')
    };

    const noDataHtml = '<p class="text-gray-400">暂无数据</p>';

    if (!elements.total) return;

    // 更新总数
    elements.total.textContent = totalTalents;

    // 初始化为无数据状态
    elements.tier.innerHTML = noDataHtml;
    elements.cpm.innerHTML = noDataHtml;
    elements.male.innerHTML = noDataHtml;
    elements.female.innerHTML = noDataHtml;

    if (!dashboardStats) return;

    // 渲染层级分布
    if (dashboardStats.tierDistribution && dashboardStats.tierDistribution.length > 0) {
        elements.tier.innerHTML = dashboardStats.tierDistribution
            .map(item => `
                <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600">${item.tier}</span>
                    <span class="font-semibold text-gray-800">${item.count}</span>
                </div>
            `).join('');
    }

    // 渲染 CPM 分布
    if (dashboardStats.cpmDistribution && dashboardStats.cpmDistribution.length > 0) {
        const cpmBoundaries = [0, 10, 15, 20, 30, Infinity];
        const cpmDataMap = new Map(dashboardStats.cpmDistribution.map(item => [item._id, item.count]));
        let cpmHtml = '';

        for (let i = 0; i < cpmBoundaries.length - 1; i++) {
            const lower = cpmBoundaries[i];
            const upper = cpmBoundaries[i + 1];
            let label = '';

            if (i === 0) {
                label = `${upper} 以下`;
            } else if (upper === Infinity) {
                label = `${lower} 以上`;
            } else {
                label = `${lower} - ${upper}`;
            }

            const count = cpmDataMap.get(lower) || 0;
            cpmHtml += `
                <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600">${label}</span>
                    <span class="font-semibold text-gray-800">${count}</span>
                </div>
            `;
        }

        elements.cpm.innerHTML = cpmHtml;
    }

    // 渲染受众分布
    const audienceBoundaries = [0, 0.4, 0.5, 0.6, 1.01];
    renderAudienceDistribution(elements.male, dashboardStats.maleAudienceDistribution, audienceBoundaries);
    renderAudienceDistribution(elements.female, dashboardStats.femaleAudienceDistribution, audienceBoundaries);
}

/**
 * 渲染受众分布
 * @param {HTMLElement} container - 容器元素
 * @param {Array} data - 分布数据
 * @param {Array} boundaries - 边界值
 */
export function renderAudienceDistribution(container, data, boundaries) {
    if (!data || data.length === 0) return;

    const dataMap = new Map(data.map(item => [item._id, item.count]));
    let html = '';

    // 从高到低渲染
    for (let i = boundaries.length - 2; i >= 0; i--) {
        const lower = boundaries[i];
        const upper = boundaries[i + 1];
        let label = '';

        if (i === boundaries.length - 2) {
            label = `${Math.round(lower * 100)}% 以上`;
        } else if (i === 0) {
            label = `${Math.round(upper * 100)}% 以下`;
        } else {
            label = `${Math.round(lower * 100)}% - ${Math.round(upper * 100)}%`;
        }

        const count = dataMap.get(lower) || 0;
        html += `
            <div class="flex justify-between items-center text-sm">
                <span class="text-gray-600">${label}</span>
                <span class="font-semibold text-gray-800">${count}</span>
            </div>
        `;
    }

    container.innerHTML = html;
}