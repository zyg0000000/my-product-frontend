/**
 * @file system-status.js
 * @description System status cards (Performance & Price) management
 */

import { SYSTEM_STATUS_API_ENDPOINT } from './constants.js';
import { apiRequest } from './api.js';
import { getNextDayOfWeek, getNextMonthDay, showToast } from './utils.js';
import { updateSystemStatus } from './state-manager.js';
import { renderPerformanceSyncComponent } from './performance-sync.js';

/**
 * Fetch and render system status
 */
export async function fetchAndRenderSystemStatus() {
    const performanceCardContainer = document.getElementById('performance-card-container');
    const priceCardContainer = document.getElementById('price-card-container');

    try {
        const response = await apiRequest(SYSTEM_STATUS_API_ENDPOINT);
        if (response.success && response.data) {
            updateSystemStatus(response.data);
            renderPerformanceCard(response.data.performance);
            renderPriceCard(response.data.price);
        }
    } catch (error) {
        performanceCardContainer.innerHTML = `<p class="text-sm text-red-500 p-4">加载全局状态失败。</p>`;
        priceCardContainer.innerHTML = '';
    }
}

/**
 * Render performance status card
 * @param {Object} data - Performance data
 */
export function renderPerformanceCard(data) {
    const performanceCardContainer = document.getElementById('performance-card-container');
    const isUpdateNeeded = data.isUpdateNeeded;
    const dotColor = isUpdateNeeded ? 'bg-red-500' : 'bg-green-500';
    const actionButton = isUpdateNeeded
        ? `<button id="update-performance-btn" class="px-3 py-1 text-sm bg-red-500 text-white font-semibold rounded-md hover:bg-red-600">立即更新</button>`
        : `<span class="px-3 py-1 text-sm bg-green-100 text-green-700 font-semibold rounded-md">✅ 已是最新</span>`;

    performanceCardContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold text-gray-800 flex items-center">
                            <span class="w-2.5 h-2.5 ${dotColor} rounded-full mr-2"></span>
                            达人表现数据 (Performance)
                        </h3>
                        <p class="text-xs text-gray-500 mt-2">最近更新: <strong class="font-mono">${data.lastUpdated ? data.lastUpdated.split('T')[0] : '无记录'}</strong></p>
                        <p class="text-xs text-gray-500 mt-1">下次检查: <strong class="font-mono">${getNextDayOfWeek(1)} (每周一)</strong></p>
                    </div>
                    ${actionButton}
                </div>
            </div>
            <div id="performance-sync-content" class="maintenance-content bg-gray-50 px-4 border-t border-gray-200"></div>
        </div>`;
}

/**
 * Render price status card
 * @param {Object} data - Price data
 */
export function renderPriceCard(data) {
    const priceCardContainer = document.getElementById('price-card-container');
    const isUpdateNeeded = data.isUpdateNeeded;
    const dotColor = isUpdateNeeded ? 'bg-red-500' : 'bg-green-500';
    const statusText = isUpdateNeeded
        ? `<strong class="text-red-600">${data.unconfirmedCount} 位达人待更新</strong>`
        : '已全部确认';
    const actionButton = isUpdateNeeded
        ? `<button id="update-price-btn" class="px-3 py-1 text-sm bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700">前往更新</button>`
        : `<span class="px-3 py-1 text-sm bg-green-100 text-green-700 font-semibold rounded-md">✅ 已确认</span>`;

    priceCardContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200/80">
            <div class="p-4 flex justify-between items-start">
                <div>
                    <h3 class="font-semibold text-gray-800 flex items-center">
                        <span class="w-2.5 h-2.5 ${dotColor} rounded-full mr-2"></span>
                        达人报价 (Price)
                    </h3>
                    <p class="text-xs text-gray-500 mt-2">本月状态: ${statusText}</p>
                    <p class="text-xs text-gray-500 mt-1">下次检查: <strong class="font-mono">${getNextMonthDay(2)} (每月2号)</strong></p>
                </div>
                ${actionButton}
            </div>
        </div>`;
}

/**
 * Handle maintenance card clicks
 * @param {Event} e - Click event
 */
export function handleMaintenanceCardClick(e) {
    if (e.target.id === 'update-performance-btn') {
        const content = document.getElementById('performance-sync-content');
        if (!content.classList.contains('expanded')) {
            renderPerformanceSyncComponent(content);
        }
        content.classList.toggle('expanded');
    }
    if (e.target.id === 'update-price-btn') {
        showToast('价格更新功能正在开发中...', false);
    }
}