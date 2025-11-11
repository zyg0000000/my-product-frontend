/**
 * @file task-details.js
 * @description Task details expansion and editing functionality
 */

import { PENDING_PUBLISH_ENDPOINT, UPDATE_COLLAB_ENDPOINT } from './constants.js';
import { apiRequest } from './api.js';
import { showToast } from './utils.js';
import { renderDataSyncComponent } from './data-sync.js';

/**
 * Handle task group header clicks (accordion behavior)
 * @param {Event} e - Click event
 */
export function handleGroupHeaderClick(e) {
    const header = e.target.closest('.task-group-header');
    if (!header) return;

    const groupElement = header.parentElement;
    const contentContainer = groupElement.querySelector('.task-group-content');
    const icon = header.querySelector('.toggle-icon');
    const parentSection = groupElement.closest('section');

    // Collapse other expanded groups in the same section
    if (parentSection) {
        parentSection.querySelectorAll('.task-group-content.expanded').forEach(el => {
            if (el !== contentContainer) {
                el.classList.remove('expanded');
                const prevIcon = el.previousElementSibling.querySelector('.toggle-icon');
                if (prevIcon) prevIcon.classList.remove('rotated');
            }
        });
    }

    // Toggle current group
    contentContainer.classList.toggle('expanded');
    if (icon) icon.classList.toggle('rotated');

    // Render content if expanding and empty
    if (contentContainer.classList.contains('expanded') && !contentContainer.innerHTML.trim()) {
        const tasks = JSON.parse(groupElement.dataset.tasks);
        const mainTaskType = tasks[0].type;
        const projectId = groupElement.dataset.projectId;

        if (mainTaskType === 'PROJECT_PENDING_PUBLISH') {
            renderPendingPublishEditor(contentContainer, projectId);
        } else if (mainTaskType.startsWith('PROJECT_DATA_OVERDUE')) {
            renderDataSyncComponent(contentContainer, mainTaskType);
        } else {
            contentContainer.innerHTML = `<p class="text-sm text-gray-600 py-2 px-4">${tasks[0].description}</p>`;
        }
    }
}

/**
 * Render pending publish editor
 * @param {HTMLElement} container - Container element
 * @param {string} projectId - Project ID
 */
export async function renderPendingPublishEditor(container, projectId) {
    try {
        const response = await apiRequest(`${PENDING_PUBLISH_ENDPOINT}?projectId=${projectId}`);

        if (!response.success) {
            throw new Error(response.message);
        }

        const talents = response.data;

        if (talents.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 py-2 px-4">所有达人均已处理。</p>`;
            // Trigger refresh after delay
            setTimeout(() => {
                const event = new CustomEvent('refreshTasks');
                document.dispatchEvent(event);
            }, 1500);
            return;
        }

        // Render editor for each talent
        container.innerHTML = `
            <ul class="space-y-3 p-4">
                ${talents.map(talent => `
                    <li class="p-3 bg-gray-100 rounded-md" data-collab-id="${talent.collaborationId}">
                        <p class="font-semibold text-gray-800 text-sm">${talent.talentName}</p>
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2 text-sm items-center">
                            <input type="date" class="publish-date-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" value="${talent.publishDate || ''}">
                            <input type="text" class="video-id-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" placeholder="视频ID" value="${talent.videoId || ''}">
                            <input type="text" class="task-id-input block w-full text-xs rounded border-gray-300 shadow-sm p-1.5" placeholder="星图任务ID" value="${talent.taskId || ''}">
                            <button class="save-collab-btn h-full px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:bg-gray-400">
                                <span>保存</span>
                                <div class="loader hidden animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (error) {
        container.innerHTML = `<p class="text-xs text-red-500 py-2 px-4">加载失败: ${error.message}</p>`;
    }
}

/**
 * Handle save collaboration button click
 * @param {Event} e - Click event
 */
export async function handleSaveCollaboration(e) {
    const saveBtn = e.target.closest('.save-collab-btn');
    if (!saveBtn) return;

    const item = saveBtn.closest('li');
    const btnSpan = saveBtn.querySelector('span');
    const btnLoader = saveBtn.querySelector('.loader');

    try {
        saveBtn.disabled = true;
        btnSpan.classList.add('hidden');
        btnLoader.classList.remove('hidden');

        const payload = {
            id: item.dataset.collabId,
            publishDate: item.querySelector('.publish-date-input').value,
            videoId: item.querySelector('.video-id-input').value,
            taskId: item.querySelector('.task-id-input').value,
            status: '视频已发布'
        };

        await apiRequest(UPDATE_COLLAB_ENDPOINT, 'PUT', payload);
        showToast('保存成功！');
        item.style.opacity = '0.5';
        btnSpan.textContent = '已保存';
    } catch (error) {
        // Error already handled in apiRequest
    } finally {
        saveBtn.disabled = false;
        btnSpan.classList.remove('hidden');
        btnLoader.classList.add('hidden');
    }
}