/**
 * @file filter-panel.js
 * @description 筛选面板模块
 */

import { rebateTasks, updateDisplayedTasks, allProjects } from './state-manager.js';

/**
 * 渲染项目筛选器
 */
export function renderProjectFilter() {
    const projectFilter = document.getElementById('project-filter');

    const projectsWithTasks = allProjects.map(p => {
        const tasks = rebateTasks.filter(t => t.projectId === p.id);
        if (tasks.length === 0) return null;
        const recoveredCount = tasks.filter(t => t.recoveredAmount !== null && !isNaN(t.recoveredAmount)).length;
        const totalCount = tasks.length;
        const isCompleted = recoveredCount === totalCount;
        return { id: p.id, name: p.name, recoveredCount, totalCount, isCompleted };
    }).filter(Boolean);

    projectFilter.innerHTML = '<option value="">所有项目</option>';
    projectsWithTasks.forEach(p => {
        const statusText = p.isCompleted ? ' (已全部回收)' : ` (${p.recoveredCount}/${p.totalCount} 已回收)`;
        projectFilter.innerHTML += `<option value="${p.id}">${p.name}${statusText}</option>`;
    });
}

/**
 * 应用筛选条件
 */
export function applyFilters() {
    const projectFilter = document.getElementById('project-filter');
    const statusFilter = document.getElementById('status-filter');
    const talentSearchInput = document.getElementById('talent-search');

    const projectFilterValue = projectFilter.value;
    const statusFilterValue = statusFilter.value;
    const searchQuery = talentSearchInput.value.toLowerCase().trim();

    const displayedTasks = rebateTasks.filter(task => {
        const projectMatch = !projectFilterValue || task.projectId === projectFilterValue;
        const searchMatch = !searchQuery || task.talentName.toLowerCase().includes(searchQuery);

        let statusMatch = true;
        if (statusFilterValue) {
            const isRecovered = task.recoveredAmount != null;
            const hasDiscrepancy = isRecovered && Math.abs(task.recoveredAmount - task.receivable) > 0.01;
            switch (statusFilterValue) {
                case 'pending':
                    statusMatch = !isRecovered;
                    break;
                case 'recovered':
                    statusMatch = isRecovered && !hasDiscrepancy;
                    break;
                case 'discrepancy':
                    statusMatch = hasDiscrepancy;
                    break;
            }
        }
        return projectMatch && searchMatch && statusMatch;
    });

    updateDisplayedTasks(displayedTasks);
}