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
    const iconColor = isUpdateNeeded ? 'text-red-600' : 'text-green-600';
    const iconBgColor = isUpdateNeeded ? 'bg-red-100' : 'bg-green-100';
    const actionButton = isUpdateNeeded
        ? `<button id="update-performance-btn" class="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            立即更新
        </button>`
        : `<span class="px-4 py-2 text-sm bg-green-100 text-green-700 font-semibold rounded-lg flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            已是最新
        </span>`;

    performanceCardContainer.innerHTML = `
        <div class="system-card bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div class="p-5">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="p-2 ${iconBgColor} rounded-lg">
                                <svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 flex items-center">
                                    <span class="w-2 h-2 ${dotColor} rounded-full mr-2"></span>
                                    达人表现数据
                                </h3>
                                <p class="text-xs text-gray-400">Performance</p>
                            </div>
                        </div>
                        <div class="space-y-1 ml-11">
                            <p class="text-xs text-gray-500">最近更新: <strong class="font-mono text-gray-700">${data.lastUpdated ? data.lastUpdated.split('T')[0] : '无记录'}</strong></p>
                            <p class="text-xs text-gray-500">下次检查: <strong class="font-mono text-gray-700">${getNextDayOfWeek(1)} (每周一)</strong></p>
                        </div>
                    </div>
                    <div class="ml-4">
                        ${actionButton}
                    </div>
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
    const iconColor = isUpdateNeeded ? 'text-amber-600' : 'text-green-600';
    const iconBgColor = isUpdateNeeded ? 'bg-amber-100' : 'bg-green-100';
    const statusText = isUpdateNeeded
        ? `<strong class="text-red-600">${data.unconfirmedCount} 位达人待更新</strong>`
        : '已全部确认';
    const actionButton = isUpdateNeeded
        ? `<button id="update-price-btn" class="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            前往更新
        </button>`
        : `<span class="px-4 py-2 text-sm bg-green-100 text-green-700 font-semibold rounded-lg flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            已确认
        </span>`;

    priceCardContainer.innerHTML = `
        <div class="system-card bg-white rounded-xl shadow-sm border border-gray-200/80">
            <div class="p-5">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="p-2 ${iconBgColor} rounded-lg">
                                <svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 flex items-center">
                                    <span class="w-2 h-2 ${dotColor} rounded-full mr-2"></span>
                                    达人报价
                                </h3>
                                <p class="text-xs text-gray-400">Price</p>
                            </div>
                        </div>
                        <div class="space-y-1 ml-11">
                            <p class="text-xs text-gray-500">本月状态: ${statusText}</p>
                            <p class="text-xs text-gray-500">下次检查: <strong class="font-mono text-gray-700">${getNextMonthDay(2)} (每月2号)</strong></p>
                        </div>
                    </div>
                    <div class="ml-4">
                        ${actionButton}
                    </div>
                </div>
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