/**
 * @file table-renderer.js
 * @description 表格渲染模块
 */

import { displayedTasks, currentPage, itemsPerPage, openRowId, getTaskById } from './state-manager.js';
import { renderPagination } from './pagination.js';

/**
 * 渲染表格主体
 */
export function renderTable() {
    const rebateListBody = document.getElementById('rebate-list-body');
    rebateListBody.innerHTML = '';

    const totalPages = Math.ceil(displayedTasks.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const paginatedTasks = displayedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (paginatedTasks.length === 0) {
        rebateListBody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-gray-500">未找到符合条件的返点任务。</td></tr>`;
    } else {
        paginatedTasks.forEach(task => {
            const isDetailsOpen = openRowId === task.id;
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            row.dataset.taskId = task.id;

            const isRecovered = task.recoveredAmount != null;
            const recoveredAmount = parseFloat(task.recoveredAmount);
            const hasDiscrepancy = isRecovered && Math.abs(recoveredAmount - task.receivable) > 0.01;

            let statusHtml;
            if (hasDiscrepancy) {
                statusHtml = `<span class="status-tag bg-red-100 text-red-800">有差异</span>`;
            } else if (isRecovered) {
                statusHtml = `<span class="status-tag bg-green-100 text-green-800">已回收</span>`;
            } else {
                statusHtml = `<span class="status-tag bg-yellow-100 text-yellow-800">待回收</span>`;
            }

            const recoveredAmountDisplay = isRecovered
                ? `¥ ${recoveredAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : 'N/A';

            row.innerHTML = `
                <td class="px-6 py-4 font-medium"><a href="order_list.html?projectId=${task.projectId}&from=rebate_management" class="text-blue-600 hover:underline">${task.projectName}</a></td>
                <td class="px-6 py-4 font-semibold text-gray-900">${task.talentName}</td>
                <td class="px-6 py-4">${task.talentSource}</td>
                <td class="px-6 py-4">${task.publishDate || 'N/A'}</td>
                <td class="px-6 py-4 font-medium text-blue-600">¥ ${task.receivable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="px-6 py-4 font-medium ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'}">${recoveredAmountDisplay}</td>
                <td class="px-6 py-4">${statusHtml}</td>
                <td class="px-6 py-4 text-center">
                    <button class="font-medium text-blue-600 hover:underline toggle-details-btn">${isDetailsOpen ? '收起' : (isRecovered ? '查看/修改' : '录入信息')}</button>
                </td>
            `;
            rebateListBody.appendChild(row);

            if (isDetailsOpen) {
                const detailsRow = document.createElement('tr');
                detailsRow.className = 'details-row open';
                detailsRow.innerHTML = renderDetailsRowContent(task);
                rebateListBody.appendChild(detailsRow);
            }
        });
    }
    renderPagination(totalPages, displayedTasks.length);
}

/**
 * 渲染详情行内容
 * @param {Object} task - 任务对象
 * @returns {string} - HTML 内容
 */
export function renderDetailsRowContent(task) {
    const isRecovered = task.recoveredAmount != null;
    const recoveredAmountNum = parseFloat(task.recoveredAmount);
    const hasDiscrepancy = !isNaN(recoveredAmountNum) && Math.abs(recoveredAmountNum - task.receivable) > 0.01;
    const screenshots = task.screenshots || [];

    let screenshotHtml = screenshots.map((imgUrl, index) => `
        <div class="relative group w-24 h-24">
            <img src="${imgUrl}" data-url="${imgUrl}" class="rounded-md w-full h-full object-cover border-2 border-gray-300 view-screenshot-btn cursor-pointer">
            <button class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center delete-screenshot-btn opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}" data-url="${imgUrl}" title="删除此凭证">&times;</button>
        </div>
    `).join('');

    if (screenshots.length === 0) {
        screenshotHtml = `
            <div class="w-full">
                <label for="image-upload-trigger" class="relative flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div class="text-center">
                        <svg class="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <p class="mt-2 text-sm text-gray-500">点击此处，或拖拽图片到这里</p>
                        <p class="mt-1 text-xs text-gray-400">最多上传5张凭证</p>
                    </div>
                </label>
                <button id="image-upload-trigger" class="hidden"></button>
            </div>`;
    } else if (screenshots.length < 5) {
        screenshotHtml += `
            <button id="add-screenshot-btn" class="w-24 h-24 bg-gray-200 text-gray-500 rounded-md flex flex-col items-center justify-center hover:bg-gray-300 transition-colors" title="继续上传凭证">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span class="text-xs mt-1">继续上传</span>
            </button>
        `;
    }

    const deleteButtonHtml = isRecovered ? `<button class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold delete-record-btn">删除记录</button>` : '';
    const recoveredValue = task.recoveredAmount ?? '';
    const discrepancyContainerClass = hasDiscrepancy ? 'bg-red-50 border border-red-200 p-3 rounded-lg' : 'hidden';

    let timestampHtml = '';
    if (task.discrepancyReasonUpdatedAt) {
        const date = new Date(task.discrepancyReasonUpdatedAt);
        const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        timestampHtml = `<p class="text-xs text-gray-500 mt-1">返点信息更新于: ${formattedDate}</p>`;
    }

    return `
        <td colspan="8" class="p-0">
            <div class="bg-blue-50 p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div class="space-y-4">
                        <div><label class="block text-sm font-medium">实收金额 <span class="text-red-500">*</span></label><input type="number" step="0.01" class="mt-1 w-full rounded-md border-gray-300 shadow-sm" placeholder="0.00" id="recovered-amount-input" value="${recoveredValue}"></div>
                        <div><label class="block text-sm font-medium">回收日期 <span class="text-red-500">*</span></label><input type="date" class="mt-1 w-full rounded-md border-gray-300 shadow-sm" id="recovery-date-input" value="${task.recoveryDate || ''}"></div>
                        <div id="discrepancy-reason-container" class="${discrepancyContainerClass}">
                            <label class="block text-sm font-bold text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-1-4a1 1 0 011-1h.008a1 1 0 011 1v2a1 1 0 01-1 1h-.008a1 1 0 01-1-1V9z" clip-rule="evenodd" /></svg>
                                差异原因 (必填)
                            </label>
                            <textarea rows="3" class="mt-1 w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500" id="discrepancy-reason-input" placeholder="请说明实收与应收不一致的原因...">${task.discrepancyReason || ''}</textarea>
                            ${timestampHtml}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">上传凭证 (截图)</label>
                        <div class="mt-2 flex flex-wrap gap-3 items-start" id="screenshot-preview-container">
                            ${screenshotHtml}
                        </div>
                    </div>
                </div>
                <div class="mt-6 flex justify-between items-center">
                    <div>${deleteButtonHtml}</div>
                    <div class="flex gap-3">
                        <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cancel-btn">取消</button>
                        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 save-btn">确认保存</button>
                    </div>
                </div>
            </div>
        </td>
    `;
}