/**
 * @file task-list.js
 * @description Task list rendering functionality
 */

/**
 * Distribute and render tasks into categories
 * @param {Object} projectsWithTasks - Projects with their associated tasks
 */
export function distributeAndRenderTasks(projectsWithTasks) {
    const dataMaintenanceList = document.getElementById('data-maintenance-list');
    const pendingPublishList = document.getElementById('pending-publish-list');
    const dataOverdueList = document.getElementById('data-overdue-list');
    const layoutContainer = document.getElementById('task-layout-container');
    const emptyState = document.getElementById('empty-state');

    // Initialize project categories
    const dataMaintenanceProjects = {};
    const pendingPublishProjects = {};
    const dataOverdueProjects = {};

    // Distribute tasks into categories
    for (const projectId in projectsWithTasks) {
        const project = projectsWithTasks[projectId];
        project.tasks.forEach(task => {
            if (task.type === 'PROJECT_PENDING_PUBLISH') {
                if (!pendingPublishProjects[projectId]) {
                    pendingPublishProjects[projectId] = {
                        projectName: project.projectName,
                        tasks: []
                    };
                }
                pendingPublishProjects[projectId].tasks.push(task);
            } else if (task.type.startsWith('PROJECT_DATA_OVERDUE')) {
                if (!dataOverdueProjects[projectId]) {
                    dataOverdueProjects[projectId] = {
                        projectName: project.projectName,
                        tasks: []
                    };
                }
                dataOverdueProjects[projectId].tasks.push(task);
            } else {
                if (!dataMaintenanceProjects[projectId]) {
                    dataMaintenanceProjects[projectId] = {
                        projectName: project.projectName,
                        tasks: []
                    };
                }
                dataMaintenanceProjects[projectId].tasks.push(task);
            }
        });
    }

    // Render task lists
    renderTaskList(dataMaintenanceList, dataMaintenanceProjects, '项目流程提醒');
    renderTaskList(pendingPublishList, pendingPublishProjects, '视频未发布');
    renderTaskList(dataOverdueList, dataOverdueProjects, '数据逾期告警');

    // Show/hide layout based on tasks
    if (Object.keys(projectsWithTasks).length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        layoutContainer.classList.remove('hidden');
    }
}

/**
 * Render task list for a specific container
 * @param {HTMLElement} container - Container element
 * @param {Object} projects - Projects to render
 * @param {string} emptyText - Text to show when no tasks
 */
export function renderTaskList(container, projects, emptyText) {
    container.innerHTML = '';

    if (Object.keys(projects).length === 0) {
        container.innerHTML = `<div class="text-center text-sm text-gray-500 py-4 bg-white rounded-lg">暂无${emptyText}任务</div>`;
        return;
    }

    const taskGroupTemplate = document.getElementById('task-group-template');
    const fragment = document.createDocumentFragment();

    for (const projectId in projects) {
        const project = projects[projectId];
        const groupNode = taskGroupTemplate.content.cloneNode(true);
        const groupElement = groupNode.querySelector('.task-group');

        // Set project name
        groupElement.querySelector('.project-name').textContent = project.projectName;

        const taskCountElement = groupElement.querySelector('.task-count');
        const viewLinkElement = groupElement.querySelector('.view-project-link');
        const mainTask = project.tasks[0];

        // Customize display based on task type
        if (mainTask.type === 'PROJECT_PENDING_PUBLISH') {
            const match = mainTask.description.match(/有 (\d+) 位达人/);
            taskCountElement.textContent = `${match ? match[1] : project.tasks.length} 条视频待发布`;
            viewLinkElement.remove();
        } else if (mainTask.type.startsWith('PROJECT_DATA_OVERDUE')) {
            const hasT7 = project.tasks.some(t => t.type.includes('T7'));
            const hasT21 = project.tasks.some(t => t.type.includes('T21'));
            let typeTexts = [];
            if (hasT7) typeTexts.push('T+7');
            if (hasT21) typeTexts.push('T+21');
            taskCountElement.textContent = `${typeTexts.join(' & ')} 数据逾期`;
            viewLinkElement.textContent = '上传数据';
        } else {
            taskCountElement.textContent = `${project.tasks.length} 项待办`;
            viewLinkElement.textContent = '处理';
        }

        // Store data attributes
        groupElement.dataset.projectId = projectId;
        groupElement.dataset.tasks = JSON.stringify(project.tasks);

        fragment.appendChild(groupNode);
    }

    container.appendChild(fragment);
}