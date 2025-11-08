/**
 * @file table-renderer.js
 * @description Table rendering with expandable sub-rows for works management
 */

import { DOUYIN_VIDEO_PREFIX } from './constants.js';
import { isWorkDetailsOpen } from './state-manager.js';
import { formatNum } from './utils.js';

/**
 * Render the works table with main rows and expandable sub-rows
 * @param {Array} works - Array of work objects to display
 */
export function renderTable(works) {
    const worksListBody = document.getElementById('works-list-body');
    worksListBody.innerHTML = '';

    if (works.length === 0) {
        worksListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-500">未找到符合条件的作品。</td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    works.forEach(work => {
        const isCollaboration = work.sourceType === 'COLLABORATION';
        const isExpanded = isWorkDetailsOpen(work.id);

        // Create main row
        const mainRow = createMainRow(work, isCollaboration, isExpanded);
        fragment.appendChild(mainRow);

        // Create sub-row for collaboration works
        if (isCollaboration) {
            const subRow = createSubRow(work, isExpanded);
            fragment.appendChild(subRow);
        }
    });

    worksListBody.appendChild(fragment);
}

/**
 * Create the main table row for a work
 */
function createMainRow(work, isCollaboration, isExpanded) {
    const mainRow = document.createElement('tr');
    mainRow.className = 'border-b hover:bg-gray-50';

    const sourceTypeTag = isCollaboration
        ? `<span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">合作作品</span>`
        : `<span class="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">非合作作品</span>`;

    const videoIdCell = work.t7_platformWorkId
        ? `<a href="${DOUYIN_VIDEO_PREFIX}${work.t7_platformWorkId}" target="_blank" class="text-blue-600 hover:underline font-mono" title="点击打开抖音视频">${work.t7_platformWorkId}</a>`
        : (work.platformWorkId || 'N/A');

    mainRow.innerHTML = `
        <td class="px-2 py-4 w-12 text-center">
            <button class="toggle-details-btn p-2 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    data-id="${work.id}"
                    ${!isCollaboration ? 'disabled' : ''}>
                <svg class="w-4 h-4 rotate-icon ${isExpanded ? 'rotated' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
        </td>
        <td class="px-6 py-4 font-medium">${videoIdCell}</td>
        <td class="px-6 py-4">${work.projectName}</td>
        <td class="px-6 py-4 font-semibold text-gray-900">${work.talentName}</td>
        <td class="px-6 py-4">${sourceTypeTag}</td>
        <td class="px-6 py-4">${work.t7_publishedAt ? new Date(work.t7_publishedAt).toLocaleDateString() : 'N/A'}</td>
        <td class="px-6 py-4 font-medium text-gray-800">${formatNum(work.t7_totalViews)}</td>
        <td class="px-6 py-4 text-center">
            <button class="delete-btn font-medium text-red-500 hover:text-red-700 hover:underline"
                    data-id="${work.id}"
                    data-title="${work.t7_platformWorkId || '该作品'}">删除</button>
        </td>
    `;

    return mainRow;
}

/**
 * Create the expandable sub-row for collaboration works
 * [v3.6 FIX] Animation is applied to .collapsible-content div, vertical padding controlled by CSS
 */
function createSubRow(work, isExpanded) {
    const subRow = document.createElement('tr');
    // Add collapsible-row class for JS selection and CSS state control
    subRow.classList.add('collapsible-row');
    if (isExpanded) {
        subRow.classList.add('expanded');
    }

    const subRowCell = document.createElement('td');
    subRowCell.colSpan = 8;
    subRowCell.className = 'bg-gray-50';

    // [v3.6 FIX] Use px-4 only, vertical padding controlled by CSS transitions
    subRowCell.innerHTML = `
        <div class="collapsible-content px-4 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">核心效果数据 (T+7)</h4>
                <p class="flex justify-between"><span>总播放:</span> <strong class="font-mono">${formatNum(work.t7_totalViews)}</strong></p>
                <p class="flex justify-between"><span>点赞量:</span> <strong class="font-mono">${formatNum(work.t7_likeCount)}</strong></p>
                <p class="flex justify-between"><span>评论量:</span> <strong class="font-mono">${formatNum(work.t7_commentCount)}</strong></p>
                <p class="flex justify-between"><span>分享量:</span> <strong class="font-mono">${formatNum(work.t7_shareCount)}</strong></p>
            </div>
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">核心效果数据 (T+21)</h4>
                <p class="flex justify-between"><span>总播放:</span> <strong class="font-mono">${formatNum(work.t21_totalViews)}</strong></p>
                <p class="flex justify-between"><span>点赞量:</span> <strong class="font-mono">${formatNum(work.t21_likeCount)}</strong></p>
                <p class="flex justify-between"><span>评论量:</span> <strong class="font-mono">${formatNum(work.t21_commentCount)}</strong></p>
                <p class="flex justify-between"><span>分享量:</span> <strong class="font-mono">${formatNum(work.t21_shareCount)}</strong></p>
            </div>
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">组件转化数据</h4>
                <p class="flex justify-between"><span>T+7 曝光/点击:</span> <strong class="font-mono">${formatNum(work.t7_componentImpressionCount)} / ${formatNum(work.t7_componentClickCount)}</strong></p>
                <p class="flex justify-between"><span>T+21 曝光/点击:</span> <strong class="font-mono">${formatNum(work.t21_componentImpressionCount)} / ${formatNum(work.t21_componentClickCount)}</strong></p>
            </div>
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-600 border-b pb-1 mb-2">关联信息</h4>
                <p class="flex justify-between"><span>星图任务ID:</span> <strong>${work.taskId || 'N/A'}</strong></p>
                <p class="flex justify-between"><span>内部合作ID:</span> <strong>${work.collaborationId || 'N/A'}</strong></p>
            </div>
        </div>
    `;

    subRow.appendChild(subRowCell);
    return subRow;
}